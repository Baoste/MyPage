import "server-only";

import { randomUUID } from "node:crypto";
import { requirePrivateSession } from "@/lib/auth/session";
import { imageDimensionsFromBytes, imageSignatureMatches } from "@/lib/food/image-headers";
import {
  extensionForPhotoMimeType,
  formatPhotoLocation,
  photoDateInTimezone,
  type PhotoUpdateInput,
  type PhotoUploadRequestInput,
} from "@/lib/photo/contracts";
import {
  deleteLocalPhotoFiles,
  getLocalPhotoFileInfo,
  isLocalPhotoStoragePath,
  photoThumbnailStoragePath,
  readLocalPhotoFile,
  readLocalPhotoFileHeader,
  writeLocalPhotoFiles,
} from "@/lib/photo/local-storage";
import { calculatePhotoStatistics } from "@/lib/photo/statistics";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deletePrivateAssets, getPrivateSignedUrl } from "@/lib/supabase/storage";
import {
  createPhotoActivityStats,
  daysBetween,
  unavailablePhotoActivity,
} from "@/lib/tree/activity";
import type {
  PhotoActivityStats,
  PhotoEntry,
  PhotoEntryRow,
  PhotoImageMimeType,
  PhotoViewModel,
} from "@/types";

const STALE_DRAFT_MILLISECONDS = 24 * 60 * 60 * 1_000;
const MAXIMUM_IMAGE_HEADER_BYTES = 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

interface LegacyPhotoRow {
  id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  photo_date: string;
  location: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export class PhotoServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PhotoServiceError";
  }
}

function assertConfigured() {
  if (!isServerSupabaseConfigured()) {
    throw new PhotoServiceError("照片记录暂时无法连接，请检查 Supabase 配置。", 503);
  }
}

function assertUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) throw new PhotoServiceError(`${label}无效。`, 400);
}

function isMissingPhotoSchemaError(error: { code?: string } | null) {
  return Boolean(error?.code && ["42703", "42P01", "PGRST200", "PGRST204", "PGRST205"].includes(error.code));
}

function legacyOccurredAt(photoDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(photoDate)
    ? `${photoDate}T04:00:00.000Z`
    : new Date(0).toISOString();
}

function mimeTypeFromPath(storagePath: string): PhotoImageMimeType {
  const normalized = storagePath.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function mapPhoto(row: PhotoEntryRow): PhotoEntry {
  return {
    id: row.id,
    storagePath: row.storage_path,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    date: row.photo_date,
    occurredAt: row.occurred_at,
    timezone: row.timezone,
    location: {
      countryCode: row.location_country_code,
      countryName: row.location_country_name,
      regionCode: row.location_region_code ?? undefined,
      regionName: row.location_region_name ?? undefined,
      cityCode: row.location_city_code ?? undefined,
      cityName: row.location_city_name,
    },
    tags: row.tags ?? [],
    width: row.width,
    height: row.height,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    capturedAt: row.captured_at ?? undefined,
    uploadedBy: row.uploader ?? undefined,
    legacyRecord: row.legacy_record,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLegacyPhoto(row: LegacyPhotoRow): PhotoEntry {
  const occurredAt = legacyOccurredAt(row.photo_date);
  return {
    id: row.id,
    storagePath: row.storage_path,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    date: row.photo_date,
    occurredAt,
    timezone: "Asia/Shanghai",
    location: {
      countryCode: "ZZ",
      countryName: "未指定",
      cityName: row.location?.trim() || "未指定",
    },
    tags: row.tags ?? [],
    width: 4,
    height: 3,
    mimeType: mimeTypeFromPath(row.storage_path),
    byteSize: 1,
    capturedAt: occurredAt,
    legacyRecord: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function photoImageUrl(photoId: string, storagePath: string) {
  return isLocalPhotoStoragePath(storagePath)
    ? `/api/private/photos/images/${encodeURIComponent(photoId)}/file`
    : getPrivateSignedUrl(storagePath);
}

async function photoThumbnailUrl(photoId: string, storagePath: string) {
  if (!isLocalPhotoStoragePath(storagePath)) return getPrivateSignedUrl(storagePath);
  const thumbnailPath = photoThumbnailStoragePath(storagePath);
  return (await getLocalPhotoFileInfo(thumbnailPath))
    ? `/api/private/photos/images/${encodeURIComponent(photoId)}/file?variant=thumbnail`
    : `/api/private/photos/images/${encodeURIComponent(photoId)}/file`;
}

async function toViewModel(photo: PhotoEntry): Promise<PhotoViewModel> {
  try {
    return {
      ...photo,
      imageUrl: await photoImageUrl(photo.id, photo.storagePath),
      thumbnailUrl: await photoThumbnailUrl(photo.id, photo.storagePath),
    };
  } catch (error) {
    console.error("Unable to sign one photo.", { photoId: photo.id, error });
    return { ...photo, imageUrl: "", thumbnailUrl: "" };
  }
}

async function getLegacyPhotoEntries() {
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("id,storage_path,title,description,photo_date,location,tags,created_at,updated_at")
    .order("photo_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load legacy photos.");
  const photos = ((data ?? []) as LegacyPhotoRow[]).map(mapLegacyPhoto);
  return mapWithConcurrency(photos, 6, toViewModel);
}

async function loadPhotoEntries(): Promise<{
  photos: PhotoViewModel[];
  schemaReady: boolean;
}> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return { photos: [], schemaReady: false };

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("*,uploader:private_users!photo_entries_owner_user_id_fkey(id,username)")
    .eq("status", "ready")
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingPhotoSchemaError(error)) {
      return { photos: await getLegacyPhotoEntries(), schemaReady: false };
    }
    throw new Error("Unable to load photos.");
  }
  const photos = ((data ?? []) as PhotoEntryRow[]).map(mapPhoto);
  return { photos: await mapWithConcurrency(photos, 6, toViewModel), schemaReady: true };
}

export async function getPhotoEntries(): Promise<PhotoViewModel[]> {
  return (await loadPhotoEntries()).photos;
}

export async function getPhotoPageData() {
  const { photos, schemaReady } = await loadPhotoEntries();
  return { photos, statistics: calculatePhotoStatistics(photos), schemaReady };
}

export async function getPhotoEntryById(id: string): Promise<PhotoViewModel | null> {
  assertUuid(id, "照片标识");
  const photos = await getPhotoEntries();
  return photos.find((photo) => photo.id === id) ?? null;
}

async function selectPhoto(photoId: string, requestId?: string, ownerUserId?: string) {
  const client = createServerSupabaseClient();
  let query = client.from("photo_entries").select("*").eq("id", photoId);
  if (requestId) query = query.eq("upload_request_id", requestId);
  if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new PhotoServiceError("无法读取照片记录。", 500);
  return data as PhotoEntryRow | null;
}

async function deletePhotoMedia(storagePath: string) {
  if (isLocalPhotoStoragePath(storagePath)) {
    await deleteLocalPhotoFiles([storagePath, photoThumbnailStoragePath(storagePath)]);
  } else {
    await deletePrivateAssets([storagePath]);
  }
}

async function removeDraft(photo: PhotoEntryRow) {
  await deletePhotoMedia(photo.storage_path);
  const client = createServerSupabaseClient();
  const { error } = await client
    .from("photo_entries")
    .delete()
    .eq("id", photo.id)
    .eq("status", "draft");
  if (error) throw new PhotoServiceError("无法清理照片上传草稿。", 500);
}

async function cleanupStaleDrafts() {
  const client = createServerSupabaseClient();
  const boundary = new Date(Date.now() - STALE_DRAFT_MILLISECONDS).toISOString();
  const { data, error } = await client
    .from("photo_entries")
    .select("*")
    .eq("status", "draft")
    .lt("created_at", boundary)
    .limit(10);
  if (error) return;
  for (const row of (data ?? []) as PhotoEntryRow[]) {
    try {
      await removeDraft(row);
    } catch (cleanupError) {
      console.error("Unable to clean a stale photo draft.", { photoId: row.id, cleanupError });
    }
  }
}

function descriptorMatches(input: PhotoUploadRequestInput, photo: PhotoEntryRow) {
  return photo.mime_type === input.mimeType
    && photo.byte_size === input.byteSize
    && photo.width === input.width
    && photo.height === input.height;
}

function uploadTarget(input: PhotoUploadRequestInput, photo: PhotoEntryRow) {
  return {
    clientId: input.clientId,
    photoId: photo.id,
    storagePath: photo.storage_path,
    uploadUrl: `/api/private/photos/uploads/${encodeURIComponent(photo.id)}?requestId=${encodeURIComponent(input.requestId)}`,
    thumbnailStoragePath: photoThumbnailStoragePath(photo.storage_path),
    thumbnailUploadUrl: `/api/private/photos/uploads/${encodeURIComponent(photo.id)}?requestId=${encodeURIComponent(input.requestId)}&variant=thumbnail`,
  };
}

export async function initializePhotoUpload(input: PhotoUploadRequestInput) {
  const session = await requirePrivateSession();
  assertConfigured();
  void cleanupStaleDrafts().catch((error) => {
    console.error("Unable to run photo draft cleanup.", error);
  });

  const client = createServerSupabaseClient();
  const { data: existingData, error: existingError } = await client
    .from("photo_entries")
    .select("*")
    .eq("upload_request_id", input.requestId)
    .eq("owner_user_id", session.userId)
    .maybeSingle();
  if (existingError) {
    if (isMissingPhotoSchemaError(existingError)) {
      throw new PhotoServiceError("请先执行最新 Photos 数据库 Migration。", 503);
    }
    throw new PhotoServiceError("无法初始化照片上传。", 500);
  }
  if (existingData) {
    const existing = existingData as PhotoEntryRow;
    if (existing.status === "ready") {
      return { photoId: existing.id, requestId: input.requestId, alreadyComplete: true };
    }
    if (!descriptorMatches(input, existing)) {
      throw new PhotoServiceError("这个上传请求已被其他内容使用，请重新打开上传面板。", 409);
    }
    return {
      photoId: existing.id,
      requestId: input.requestId,
      upload: uploadTarget(input, existing),
      alreadyComplete: false,
    };
  }

  const photoId = randomUUID();
  const extension = extensionForPhotoMimeType(input.mimeType);
  const storagePath = `photos/${photoId}/${photoId}.${extension}`;
  const { data, error } = await client.from("photo_entries").insert({
    id: photoId,
    storage_path: storagePath,
    title: input.title ?? null,
    description: input.description ?? null,
    photo_date: photoDateInTimezone(input.occurredAt, input.timezone),
    location: formatPhotoLocation(input.location),
    tags: input.tags,
    occurred_at: input.occurredAt,
    timezone: input.timezone,
    location_country_code: input.location.countryCode,
    location_country_name: input.location.countryName,
    location_region_code: input.location.regionCode ?? null,
    location_region_name: input.location.regionName ?? null,
    location_city_code: input.location.cityCode ?? null,
    location_city_name: input.location.cityName,
    width: input.width,
    height: input.height,
    mime_type: input.mimeType,
    byte_size: input.byteSize,
    captured_at: input.capturedAt ?? input.occurredAt,
    status: "draft",
    upload_request_id: input.requestId,
    owner_user_id: session.userId,
    legacy_record: false,
  }).select("*").single();
  if (error || !data) {
    if (isMissingPhotoSchemaError(error)) {
      throw new PhotoServiceError("请先执行最新 Photos 数据库 Migration。", 503);
    }
    throw new PhotoServiceError("无法创建照片上传草稿。", 500);
  }
  const photo = data as PhotoEntryRow;
  return {
    photoId,
    requestId: input.requestId,
    upload: uploadTarget(input, photo),
    alreadyComplete: false,
  };
}

function assertPhotoContents(
  photo: Pick<PhotoEntryRow, "byte_size" | "mime_type" | "width" | "height">,
  bytes: Uint8Array,
  actualByteSize = bytes.byteLength,
) {
  if (actualByteSize !== photo.byte_size) {
    throw new PhotoServiceError("图片大小与选择时不一致。", 422);
  }
  if (!imageSignatureMatches(bytes, photo.mime_type)) {
    throw new PhotoServiceError("图片文件内容与格式不一致。", 422);
  }
  const dimensions = imageDimensionsFromBytes(bytes, photo.mime_type);
  if (!dimensions || dimensions.width !== photo.width || dimensions.height !== photo.height) {
    throw new PhotoServiceError("上传后的图片尺寸与选择时不一致。", 422);
  }
}

export async function uploadPhotoImage(
  photoId: string,
  requestId: string,
  bytes: Uint8Array,
  contentType: string,
  variant: "original" | "thumbnail" = "original",
) {
  const session = await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  assertUuid(requestId, "上传请求标识");
  const photo = await selectPhoto(photoId, requestId, session.userId);
  if (!photo || photo.status !== "draft") {
    throw new PhotoServiceError("上传草稿不存在或已经过期。", 404);
  }
  if (contentType !== photo.mime_type) {
    throw new PhotoServiceError("图片格式与选择时不一致。", 422);
  }
  if (variant === "original") {
    assertPhotoContents(photo, bytes);
  } else {
    const dimensions = imageDimensionsFromBytes(bytes, photo.mime_type);
    if (
      !dimensions
      || dimensions.width <= 0
      || dimensions.height <= 0
      || dimensions.width > photo.width
      || dimensions.height > photo.height
    ) {
      throw new PhotoServiceError("缩略图不符合要求。", 422);
    }
  }
  try {
    await writeLocalPhotoFiles(
      variant === "original"
        ? [photo.storage_path]
        : [photoThumbnailStoragePath(photo.storage_path)],
      bytes,
    );
  } catch (error) {
    console.error("Unable to write a local photo.", { photoId, error });
    throw new PhotoServiceError("无法写入本地图片目录，请检查 PHOTO_STORAGE_ROOT。", 500);
  }
}

export async function completePhotoUpload(photoId: string, requestId: string) {
  const session = await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  assertUuid(requestId, "上传请求标识");
  const photo = await selectPhoto(photoId, requestId, session.userId);
  if (!photo) throw new PhotoServiceError("上传草稿不存在或已经过期。", 404);
  if (photo.status === "ready") return { photoId };

  try {
    const info = await getLocalPhotoFileInfo(photo.storage_path);
    if (!info || info.size !== photo.byte_size) {
      throw new PhotoServiceError("上传后的图片信息与选择时不一致。", 422);
    }
    const bytes = await readLocalPhotoFileHeader(photo.storage_path, MAXIMUM_IMAGE_HEADER_BYTES);
    if (!bytes) throw new PhotoServiceError("无法读取已上传图片。", 422);
    const thumbnailPath = photoThumbnailStoragePath(photo.storage_path);
    const thumbnailInfo = await getLocalPhotoFileInfo(thumbnailPath);
    if (!thumbnailInfo) {
      throw new PhotoServiceError("缩略图不存在或已上传失败。", 422);
    }
    assertPhotoContents(photo, bytes, info.size);
    const thumbnailBytes = await readLocalPhotoFileHeader(thumbnailPath, MAXIMUM_IMAGE_HEADER_BYTES);
    if (!thumbnailBytes) throw new PhotoServiceError("无法读取缩略图。", 422);
    const thumbnailDimensions = imageDimensionsFromBytes(thumbnailBytes, photo.mime_type);
    if (
      !thumbnailDimensions
      || thumbnailDimensions.width > photo.width
      || thumbnailDimensions.height > photo.height
      || thumbnailInfo.size > info.size
    ) {
      throw new PhotoServiceError("缩略图不符合要求。", 422);
    }
  } catch (error) {
    try {
      await removeDraft(photo);
    } catch (cleanupError) {
      console.error("Unable to roll back an invalid photo upload.", { photoId, cleanupError });
    }
    throw error;
  }

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .update({ status: "ready" })
    .eq("id", photoId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data) throw new PhotoServiceError("无法完成照片记录。", 500);
  return { photoId };
}

export async function cancelPhotoUpload(photoId: string, requestId: string) {
  const session = await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  assertUuid(requestId, "上传请求标识");
  const photo = await selectPhoto(photoId, requestId, session.userId);
  if (!photo || photo.status === "ready") return;
  await removeDraft(photo);
}

export async function updatePhoto(photoId: string, input: PhotoUpdateInput) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .update({
      title: input.title ?? null,
      description: input.description ?? null,
      photo_date: photoDateInTimezone(input.occurredAt, input.timezone),
      location: formatPhotoLocation(input.location),
      tags: input.tags,
      occurred_at: input.occurredAt,
      timezone: input.timezone,
      location_country_code: input.location.countryCode,
      location_country_name: input.location.countryName,
      location_region_code: input.location.regionCode ?? null,
      location_region_name: input.location.regionName ?? null,
      location_city_code: input.location.cityCode ?? null,
      location_city_name: input.location.cityName,
    })
    .eq("id", photoId)
    .eq("status", "ready")
    .select("id")
    .maybeSingle();
  if (error) {
    if (isMissingPhotoSchemaError(error)) {
      throw new PhotoServiceError("请先执行最新 Photos 数据库 Migration。", 503);
    }
    throw new PhotoServiceError("无法修改照片记录。", 500);
  }
  if (!data) throw new PhotoServiceError("照片不存在或当前不可修改。", 404);
  return { photoId };
}

export async function deletePhoto(photoId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const photo = await selectPhoto(photoId);
  if (!photo) throw new PhotoServiceError("照片不存在。", 404);
  if (photo.status !== "ready") throw new PhotoServiceError("这张照片当前不可删除。", 409);

  const client = createServerSupabaseClient();
  const { data: hidden, error: hiddenError } = await client
    .from("photo_entries")
    .update({ status: "draft" })
    .eq("id", photoId)
    .eq("status", "ready")
    .select("id")
    .maybeSingle();
  if (hiddenError || !hidden) throw new PhotoServiceError("无法锁定待删除的照片。", 409);

  try {
    await deletePhotoMedia(photo.storage_path);
  } catch {
    const { error: restoreError } = await client
      .from("photo_entries")
      .update({ status: "ready" })
      .eq("id", photoId)
      .eq("status", "draft");
    if (restoreError) console.error("Unable to restore photo after media deletion failed.", { photoId });
    throw new PhotoServiceError("无法删除私密图片，记录没有被删除。", 500);
  }

  const { data: deleted, error: deleteError } = await client
    .from("photo_entries")
    .delete()
    .eq("id", photoId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (deleteError || !deleted) {
    throw new PhotoServiceError("图片已清理，记录将在后台继续清理。", 500);
  }
}

export async function readPhotoImageFile(
  photoId: string,
  variant: "original" | "thumbnail" = "original",
) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("storage_path,mime_type,byte_size")
    .eq("id", photoId)
    .eq("status", "ready")
    .maybeSingle();
  if (error) throw new PhotoServiceError("无法读取照片记录。", 500);
  if (!data) throw new PhotoServiceError("照片不存在。", 404);
  const photo = data as Pick<PhotoEntryRow, "storage_path" | "mime_type" | "byte_size">;
  if (!isLocalPhotoStoragePath(photo.storage_path)) {
    throw new PhotoServiceError("这张照片不属于本地文件。", 404);
  }
  const storagePath = variant === "thumbnail"
    ? photoThumbnailStoragePath(photo.storage_path)
    : photo.storage_path;
  const info = await getLocalPhotoFileInfo(storagePath);
  if (!info) throw new PhotoServiceError("本地图片不存在。", 404);
  if (variant === "original" && info.size !== photo.byte_size) {
    throw new PhotoServiceError("本地图片大小与数据库记录不一致。", 409);
  }
  return { bytes: await readLocalPhotoFile(storagePath), mimeType: photo.mime_type };
}

export async function refreshPhotoImageUrl(photoId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("storage_path")
    .eq("id", photoId)
    .eq("status", "ready")
    .maybeSingle();
  if (error && isMissingPhotoSchemaError(error)) {
    const legacy = await client
      .from("photo_entries")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();
    if (legacy.error) throw new PhotoServiceError("无法刷新图片地址。", 500);
    if (!legacy.data) throw new PhotoServiceError("照片不存在。", 404);
    return photoThumbnailUrl(photoId, (legacy.data as { storage_path: string }).storage_path);
  }
  if (error) throw new PhotoServiceError("无法刷新图片地址。", 500);
  if (!data) throw new PhotoServiceError("照片不存在。", 404);
  return photoThumbnailUrl(photoId, (data as { storage_path: string }).storage_path);
}

export async function getPhotoActivityStats(
  now = new Date(),
): Promise<PhotoActivityStats> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return { ...unavailablePhotoActivity };

  try {
    const client = createServerSupabaseClient();
    let latestPhotoResult = await client
      .from("photo_entries")
      .select("occurred_at")
      .eq("status", "ready")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (isMissingPhotoSchemaError(latestPhotoResult.error)) {
      latestPhotoResult = await client
        .from("photo_entries")
        .select("photo_date")
        .order("photo_date", { ascending: false })
        .limit(1)
        .maybeSingle();
    }

    let latestFoodResult = await client
      .from("food_entries")
      .select("occurred_at")
      .eq("status", "ready")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (isMissingPhotoSchemaError(latestFoodResult.error)) {
      latestFoodResult = await client
        .from("food_entries")
        .select("food_date")
        .order("food_date", { ascending: false })
        .limit(1)
        .maybeSingle();
    }

    if (latestPhotoResult.error && latestFoodResult.error) {
      console.error("Unable to calculate private media activity.", {
        photo: latestPhotoResult.error.code,
        food: latestFoodResult.error.code,
      });
      return { ...unavailablePhotoActivity };
    }

    const photoRow = latestPhotoResult.data as { occurred_at?: string; photo_date?: string } | null;
    const foodRow = latestFoodResult.data as { occurred_at?: string; food_date?: string } | null;
    const timestamps = [photoRow?.occurred_at, photoRow?.photo_date, foodRow?.occurred_at, foodRow?.food_date]
      .filter((value): value is string => typeof value === "string")
      .map((value) => new Date(value))
      .filter((value) => Number.isFinite(value.getTime()));
    const latestTimestamp = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map((value) => value.getTime())))
      : null;
    const daysSinceLastUpload = latestTimestamp && Number.isFinite(latestTimestamp.getTime())
      ? daysBetween(now, latestTimestamp)
      : null;
    return createPhotoActivityStats(daysSinceLastUpload);
  } catch (error) {
    console.error(
      "Unable to initialize private photo activity.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { ...unavailablePhotoActivity };
  }
}
