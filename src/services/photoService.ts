import "server-only";

import { randomUUID } from "node:crypto";
import { requirePrivateSession } from "@/lib/auth/session";
import { imageDimensionsFromBytes, imageSignatureMatches } from "@/lib/food/image-headers";
import {
  extensionForPhotoMimeType,
  formatPhotoLocation,
  PHOTO_IMAGE_MIME_TYPES,
  PHOTO_UPLOAD_LIMITS,
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
  writeLocalPhotoFile,
  writeLocalPhotoFiles,
} from "@/lib/photo/local-storage";
import {
  calculatePhotoStatistics,
  type PhotoStatisticsSource,
} from "@/lib/photo/statistics";
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
  PhotoComment,
  PhotoCommentRow,
  PhotoEntry,
  PhotoEntryRow,
  PhotoImage,
  PhotoImageRow,
  PhotoImageMimeType,
  PhotoImageViewModel,
  PhotoPage,
  PhotoViewModel,
} from "@/types";

const STALE_DRAFT_MILLISECONDS = 24 * 60 * 60 * 1_000;
const MAXIMUM_IMAGE_HEADER_BYTES = 1024 * 1024;
const MAXIMUM_COMMENT_CHARACTERS = 1000;
const PHOTOS_PER_PAGE = 12;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

interface PhotoCursor {
  occurredAt: string;
  createdAt: string;
  id: string;
}

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

function normalizedCursorDate(value: unknown) {
  if (typeof value !== "string") throw new PhotoServiceError("分页游标无效。", 400);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new PhotoServiceError("分页游标无效。", 400);
  return date.toISOString();
}

function decodePhotoCursor(value?: string | null): PhotoCursor | null {
  if (!value) return null;
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new PhotoServiceError("分页游标无效。", 400);
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      occurredAt?: unknown;
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.id !== "string" || !UUID_PATTERN.test(parsed.id)) {
      throw new PhotoServiceError("分页游标无效。", 400);
    }
    return {
      occurredAt: normalizedCursorDate(parsed.occurredAt),
      createdAt: normalizedCursorDate(parsed.createdAt),
      id: parsed.id.toLowerCase(),
    };
  } catch (error) {
    if (error instanceof PhotoServiceError) throw error;
    throw new PhotoServiceError("分页游标无效。", 400);
  }
}

function encodePhotoCursor(row: PhotoEntryRow) {
  const cursor: PhotoCursor = {
    occurredAt: new Date(row.occurred_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
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

function isMissingPhotoCommentSchemaError(error: { code?: string } | null) {
  return Boolean(error?.code && ["42P01", "PGRST200", "PGRST204", "PGRST205"].includes(error.code));
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

function mapPhotoImage(row: PhotoImageRow): PhotoImage {
  return {
    id: row.id,
    photoEntryId: row.photo_entry_id,
    storagePath: row.storage_path,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
    capturedAt: row.captured_at ?? undefined,
    legacyPath: row.legacy_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPhoto(row: PhotoEntryRow, images: PhotoImage[] = []): PhotoEntry {
  return {
    id: row.id,
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
    images,
    uploadedBy: row.uploader ?? undefined,
    legacyRecord: row.legacy_record,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapComment(row: PhotoCommentRow): PhotoComment {
  return {
    id: row.id,
    photoEntryId: row.photo_entry_id,
    authorUsername: row.author_username,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapLegacyPhoto(row: LegacyPhotoRow): PhotoEntry {
  const occurredAt = legacyOccurredAt(row.photo_date);
  return {
    id: row.id,
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
    images: [{
      id: row.id,
      photoEntryId: row.id,
      storagePath: row.storage_path,
      sortOrder: 0,
      width: 4,
      height: 3,
      mimeType: mimeTypeFromPath(row.storage_path),
      byteSize: 1,
      capturedAt: occurredAt,
      legacyPath: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }],
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

async function photoImageUrl(imageId: string, storagePath: string, version?: string) {
  return isLocalPhotoStoragePath(storagePath)
    ? `/api/private/photos/images/${encodeURIComponent(imageId)}/file${version ? `?v=${encodeURIComponent(version)}` : ""}`
    : getPrivateSignedUrl(storagePath);
}

async function photoThumbnailUrl(imageId: string, storagePath: string, version?: string) {
  if (!isLocalPhotoStoragePath(storagePath)) return getPrivateSignedUrl(storagePath);
  const thumbnailPath = photoThumbnailStoragePath(storagePath);
  const suffix = version ? `&v=${encodeURIComponent(version)}` : "";
  return (await getLocalPhotoFileInfo(thumbnailPath))
    ? `/api/private/photos/images/${encodeURIComponent(imageId)}/file?variant=thumbnail${suffix}`
    : `/api/private/photos/images/${encodeURIComponent(imageId)}/file${version ? `?v=${encodeURIComponent(version)}` : ""}`;
}

async function toImageViewModel(image: PhotoImage): Promise<PhotoImageViewModel> {
  try {
    return {
      ...image,
      imageUrl: await photoImageUrl(image.id, image.storagePath, image.updatedAt),
      thumbnailUrl: await photoThumbnailUrl(image.id, image.storagePath, image.updatedAt),
    };
  } catch (error) {
    console.error("Unable to sign one photo image.", { imageId: image.id, error });
    return { ...image, imageUrl: "", thumbnailUrl: "" };
  }
}

async function hydratePhotoEntries(rows: PhotoEntryRow[]): Promise<PhotoViewModel[]> {
  if (!rows.length) return [];
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_images")
    .select("*")
    .in("photo_entry_id", rows.map((row) => row.id))
    .order("sort_order", { ascending: true });
  if (error) throw new PhotoServiceError("Photos 数据库迁移不完整，请执行最新 Migration。", 503);
  const byEntry = new Map<string, PhotoImage[]>();
  for (const row of (data ?? []) as PhotoImageRow[]) {
    const image = mapPhotoImage(row);
    byEntry.set(image.photoEntryId, [...(byEntry.get(image.photoEntryId) ?? []), image]);
  }
  const entries = rows.map((row) => mapPhoto(row, byEntry.get(row.id) ?? []));
  const images = await mapWithConcurrency(entries.flatMap((entry) => entry.images), 6, toImageViewModel);
  const imageMap = new Map(images.map((image) => [image.id, image]));
  return entries.map((entry) => ({ ...entry, images: entry.images.map((image) => imageMap.get(image.id)!) }));
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
  const images = await mapWithConcurrency(photos.map((photo) => photo.images[0]), 6, toImageViewModel);
  return photos.map((photo, index) => ({ ...photo, images: [images[index]] }));
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
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    if (isMissingPhotoSchemaError(error)) {
      return { photos: await getLegacyPhotoEntries(), schemaReady: false };
    }
    throw new Error("Unable to load photos.");
  }
  try {
    return { photos: await hydratePhotoEntries((data ?? []) as PhotoEntryRow[]), schemaReady: true };
  } catch (hydrationError) {
    if (hydrationError instanceof PhotoServiceError && hydrationError.status === 503) {
      return { photos: await getLegacyPhotoEntries(), schemaReady: false };
    }
    throw hydrationError;
  }
}

async function loadPhotoPage(cursorValue?: string | null): Promise<PhotoPage & {
  schemaReady: boolean;
}> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) {
    return { photos: [], nextCursor: null, schemaReady: false };
  }

  const cursor = decodePhotoCursor(cursorValue);
  const client = createServerSupabaseClient();
  let query = client
    .from("photo_entries")
    .select("*,uploader:private_users!photo_entries_owner_user_id_fkey(id,username)")
    .eq("status", "ready")
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PHOTOS_PER_PAGE + 1);

  if (cursor) {
    query = query.or([
      `occurred_at.lt.${cursor.occurredAt}`,
      `and(occurred_at.eq.${cursor.occurredAt},created_at.lt.${cursor.createdAt})`,
      `and(occurred_at.eq.${cursor.occurredAt},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    ].join(","));
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingPhotoSchemaError(error)) {
      return {
        photos: await getLegacyPhotoEntries(),
        nextCursor: null,
        schemaReady: false,
      };
    }
    throw new PhotoServiceError("暂时无法读取更多照片。", 500);
  }

  const fetchedRows = (data ?? []) as PhotoEntryRow[];
  const rows = fetchedRows.slice(0, PHOTOS_PER_PAGE);
  const nextCursor = fetchedRows.length > PHOTOS_PER_PAGE && rows.length > 0
    ? encodePhotoCursor(rows[rows.length - 1])
    : null;
  try {
    return { photos: await hydratePhotoEntries(rows), nextCursor, schemaReady: true };
  } catch (hydrationError) {
    if (hydrationError instanceof PhotoServiceError && hydrationError.status === 503) {
      return { photos: await getLegacyPhotoEntries(), nextCursor: null, schemaReady: false };
    }
    throw hydrationError;
  }
}

function photoStatisticsSources(photos: PhotoViewModel[]): PhotoStatisticsSource[] {
  return photos.map((photo) => ({
    id: photo.id,
    title: photo.title,
    description: photo.description,
    occurredAt: photo.occurredAt,
    location: photo.location,
    tags: photo.tags,
  }));
}

async function loadPhotoStatistics() {
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("id,title,description,tags,occurred_at,location_country_code,location_country_name,location_region_code,location_region_name,location_city_code,location_city_name")
    .eq("status", "ready");
  if (error) throw new Error("Unable to load photo statistics.");

  type StatisticsRow = Pick<
    PhotoEntryRow,
    | "id"
    | "title"
    | "description"
    | "tags"
    | "occurred_at"
    | "location_country_code"
    | "location_country_name"
    | "location_region_code"
    | "location_region_name"
    | "location_city_code"
    | "location_city_name"
  >;
  const sources = ((data ?? []) as StatisticsRow[]).map((row): PhotoStatisticsSource => ({
    id: row.id,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    occurredAt: row.occurred_at,
    location: {
      countryCode: row.location_country_code,
      countryName: row.location_country_name,
      regionCode: row.location_region_code ?? undefined,
      regionName: row.location_region_name ?? undefined,
      cityCode: row.location_city_code ?? undefined,
      cityName: row.location_city_name,
    },
    tags: row.tags ?? [],
  }));
  return calculatePhotoStatistics(sources);
}

export async function getPhotoEntries(): Promise<PhotoViewModel[]> {
  return (await loadPhotoEntries()).photos;
}

export async function getPhotoPage(cursor?: string | null): Promise<PhotoPage> {
  const { photos, nextCursor } = await loadPhotoPage(cursor);
  return { photos, nextCursor };
}

export async function getPhotoPageData() {
  const { photos, nextCursor, schemaReady } = await loadPhotoPage();
  const statistics = schemaReady
    ? await loadPhotoStatistics()
    : calculatePhotoStatistics(photoStatisticsSources(photos));
  return { photos, nextCursor, statistics, schemaReady };
}

function validatedCommentContent(value: unknown) {
  if (typeof value !== "string" || value.includes("\0")) {
    throw new PhotoServiceError("请输入有效的评论内容。", 400);
  }
  const content = value.replace(/\r\n?/gu, "\n").trim();
  const length = Array.from(content).length;
  if (length < 1 || length > MAXIMUM_COMMENT_CHARACTERS) {
    throw new PhotoServiceError("评论需为 1～1000 个字符。", 400);
  }
  return content;
}

async function readyPhotoClient(photoId: string) {
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_entries")
    .select("id")
    .eq("id", photoId)
    .eq("status", "ready")
    .maybeSingle();
  if (error) {
    if (isMissingPhotoSchemaError(error)) {
      throw new PhotoServiceError("请先执行最新 Photos 数据库 Migration。", 503);
    }
    throw new PhotoServiceError("无法读取照片记录。", 500);
  }
  if (!data) throw new PhotoServiceError("照片不存在。", 404);
  return client;
}

export async function getPhotoComments(photoId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const client = await readyPhotoClient(photoId);
  const { data, error } = await client
    .from("photo_comments")
    .select("id,photo_entry_id,author_user_id,author_username,content,created_at")
    .eq("photo_entry_id", photoId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    if (isMissingPhotoCommentSchemaError(error)) {
      throw new PhotoServiceError("请先执行 202609010003_photo_comments.sql。", 503);
    }
    throw new PhotoServiceError("暂时无法读取评论。", 500);
  }
  return ((data ?? []) as PhotoCommentRow[]).map(mapComment);
}

export async function createPhotoComment(photoId: string, contentValue: unknown) {
  const session = await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const content = validatedCommentContent(contentValue);
  const client = await readyPhotoClient(photoId);
  const { data, error } = await client
    .from("photo_comments")
    .insert({
      photo_entry_id: photoId,
      author_user_id: session.userId,
      author_username: session.username,
      content,
    })
    .select("id,photo_entry_id,author_user_id,author_username,content,created_at")
    .single();
  if (error) {
    if (isMissingPhotoCommentSchemaError(error)) {
      throw new PhotoServiceError("请先执行 202609010003_photo_comments.sql。", 503);
    }
    if (error.code === "23503") {
      throw new PhotoServiceError("账号信息已失效，请重新登录。", 401);
    }
    throw new PhotoServiceError("暂时无法发布评论。", 500);
  }
  return mapComment(data as PhotoCommentRow);
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

async function selectPhotoImages(photoId: string) {
  const client = createServerSupabaseClient();
  const { data, error } = await client.from("photo_images").select("*").eq("photo_entry_id", photoId).order("sort_order");
  if (error) throw new PhotoServiceError("无法读取照片组内图片。", 500);
  return (data ?? []) as PhotoImageRow[];
}

async function deletePhotoMedia(paths: string[]) {
  const localPaths: string[] = [];
  const remotePaths: string[] = [];
  for (const storagePath of [...new Set(paths)]) {
    if (isLocalPhotoStoragePath(storagePath) && await getLocalPhotoFileInfo(storagePath)) {
      localPaths.push(storagePath, photoThumbnailStoragePath(storagePath));
    } else {
      remotePaths.push(storagePath);
    }
  }
  await deleteLocalPhotoFiles(localPaths);
  await deletePrivateAssets(remotePaths);
}

async function removeDraft(photoId: string, paths: string[]) {
  await deletePhotoMedia(paths);
  const client = createServerSupabaseClient();
  const { error } = await client
    .from("photo_entries")
    .delete()
    .eq("id", photoId)
    .eq("status", "draft");
  if (error) throw new PhotoServiceError("无法清理照片上传草稿。", 500);
}

async function cleanupStaleDrafts() {
  const client = createServerSupabaseClient();
  const boundary = new Date(Date.now() - STALE_DRAFT_MILLISECONDS).toISOString();
  const { data, error } = await client
    .from("photo_entries")
    .select("id")
    .eq("status", "draft")
    .lt("created_at", boundary)
    .limit(10);
  if (error) return;
  for (const row of (data ?? []) as Array<{ id: string }>) {
    try {
      const images = await selectPhotoImages(row.id);
      await removeDraft(row.id, images.map((image) => image.storage_path));
    } catch (cleanupError) {
      console.error("Unable to clean a stale photo draft.", { photoId: row.id, cleanupError });
    }
  }
}

function descriptorsMatch(input: PhotoUploadRequestInput, images: PhotoImageRow[]) {
  return images.length === input.images.length && images.every((image, index) => {
    const expected = input.images[index];
    return image.sort_order === index
      && image.mime_type === expected.mimeType
      && Number(image.byte_size) === expected.byteSize
      && image.width === expected.width
      && image.height === expected.height;
  });
}

function uploadTargets(input: PhotoUploadRequestInput, images: PhotoImageRow[]) {
  return images.map((image) => ({
    clientId: input.images[image.sort_order].clientId,
    photoId: image.photo_entry_id,
    imageId: image.id,
    storagePath: image.storage_path,
    uploadUrl: `/api/private/photos/uploads/${encodeURIComponent(image.photo_entry_id)}/${encodeURIComponent(image.id)}?requestId=${encodeURIComponent(input.requestId)}`,
    thumbnailStoragePath: photoThumbnailStoragePath(image.storage_path),
    thumbnailUploadUrl: `/api/private/photos/uploads/${encodeURIComponent(image.photo_entry_id)}/${encodeURIComponent(image.id)}?requestId=${encodeURIComponent(input.requestId)}&variant=thumbnail`,
  }));
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
      return { photoId: existing.id, requestId: input.requestId, uploads: [], alreadyComplete: true };
    }
    const images = await selectPhotoImages(existing.id);
    if (!descriptorsMatch(input, images)) {
      throw new PhotoServiceError("这个上传请求已被其他内容使用，请重新打开上传面板。", 409);
    }
    return {
      photoId: existing.id,
      requestId: input.requestId,
      uploads: uploadTargets(input, images),
      alreadyComplete: false,
    };
  }

  const photoId = randomUUID();
  const imageRows = input.images.map((image, index): PhotoImageRow => {
    const imageId = index === 0 ? photoId : randomUUID();
    const extension = extensionForPhotoMimeType(image.mimeType);
    return {
      id: imageId,
      photo_entry_id: photoId,
      storage_path: `photos/${photoId}/${imageId}.${extension}`,
      sort_order: index,
      width: image.width,
      height: image.height,
      mime_type: image.mimeType,
      byte_size: image.byteSize,
      captured_at: image.capturedAt ?? null,
      legacy_path: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
  const firstImage = imageRows[0];
  const { error: entryError } = await client.from("photo_entries").insert({
    id: photoId,
    storage_path: firstImage.storage_path,
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
    width: firstImage.width,
    height: firstImage.height,
    mime_type: firstImage.mime_type,
    byte_size: firstImage.byte_size,
    captured_at: firstImage.captured_at ?? input.occurredAt,
    status: "draft",
    upload_request_id: input.requestId,
    owner_user_id: session.userId,
    legacy_record: false,
  });
  if (entryError) {
    if (isMissingPhotoSchemaError(entryError)) {
      throw new PhotoServiceError("请先执行最新 Photos 数据库 Migration。", 503);
    }
    throw new PhotoServiceError("无法创建照片上传草稿。", 500);
  }

  const { error: imagesError } = await client.from("photo_images").insert(imageRows.map((image) => ({
    id: image.id,
    photo_entry_id: image.photo_entry_id,
    storage_path: image.storage_path,
    sort_order: image.sort_order,
    width: image.width,
    height: image.height,
    mime_type: image.mime_type,
    byte_size: image.byte_size,
    captured_at: image.captured_at,
    legacy_path: image.legacy_path,
  })));
  if (imagesError) {
    await client.from("photo_entries").delete().eq("id", photoId);
    throw new PhotoServiceError("无法创建照片组内图片记录。", 500);
  }
  return {
    photoId,
    requestId: input.requestId,
    uploads: uploadTargets(input, imageRows),
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
  imageId: string,
  requestId: string,
  bytes: Uint8Array,
  contentType: string,
  variant: "original" | "thumbnail" = "original",
) {
  const session = await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  assertUuid(imageId, "图片标识");
  assertUuid(requestId, "上传请求标识");
  const photo = await selectPhoto(photoId, requestId, session.userId);
  if (!photo || photo.status !== "draft") {
    throw new PhotoServiceError("上传草稿不存在或已经过期。", 404);
  }
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_images")
    .select("*")
    .eq("id", imageId)
    .eq("photo_entry_id", photoId)
    .maybeSingle();
  if (error) throw new PhotoServiceError("无法读取待上传图片记录。", 500);
  if (!data) throw new PhotoServiceError("待上传图片不存在。", 404);
  const image = data as PhotoImageRow;

  if (contentType !== image.mime_type) {
    throw new PhotoServiceError("图片格式与选择时不一致。", 422);
  }
  if (variant === "original") {
    assertPhotoContents(image, bytes);
  } else {
    const dimensions = imageDimensionsFromBytes(bytes, image.mime_type);
    if (
      !dimensions
      || dimensions.width <= 0
      || dimensions.height <= 0
      || Math.max(dimensions.width, dimensions.height) > Math.max(image.width, image.height)
    ) {
      throw new PhotoServiceError("缩略图不符合要求。", 422);
    }
  }
  try {
    await writeLocalPhotoFiles(
      variant === "original"
        ? [image.storage_path]
        : [photoThumbnailStoragePath(image.storage_path)],
      bytes,
    );
  } catch (error) {
    console.error("Unable to write a local photo.", { photoId, imageId, error });
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
  const images = await selectPhotoImages(photoId);
  if (images.length < 1 || images.length > PHOTO_UPLOAD_LIMITS.maximumImages) {
    throw new PhotoServiceError("上传草稿中的图片数量无效。", 422);
  }

  try {
    await mapWithConcurrency(images, 3, async (image) => {
      const info = await getLocalPhotoFileInfo(image.storage_path);
      if (!info || info.size !== image.byte_size) {
        throw new PhotoServiceError("上传后的图片信息与选择时不一致。", 422);
      }
      const bytes = await readLocalPhotoFileHeader(image.storage_path, MAXIMUM_IMAGE_HEADER_BYTES);
      if (!bytes) throw new PhotoServiceError("无法读取已上传图片。", 422);
      const thumbnailPath = photoThumbnailStoragePath(image.storage_path);
      const thumbnailInfo = await getLocalPhotoFileInfo(thumbnailPath);
      if (!thumbnailInfo) throw new PhotoServiceError("缩略图不存在或已上传失败。", 422);
      assertPhotoContents(image, bytes, info.size);
      const thumbnailBytes = await readLocalPhotoFileHeader(thumbnailPath, MAXIMUM_IMAGE_HEADER_BYTES);
      if (!thumbnailBytes) throw new PhotoServiceError("无法读取缩略图。", 422);
      const thumbnailDimensions = imageDimensionsFromBytes(thumbnailBytes, image.mime_type);
      if (
        !thumbnailDimensions
        || Math.max(thumbnailDimensions.width, thumbnailDimensions.height) > Math.max(image.width, image.height)
        || thumbnailInfo.size > info.size
      ) throw new PhotoServiceError("缩略图不符合要求。", 422);
    });
  } catch (error) {
    try {
      await removeDraft(photoId, images.map((image) => image.storage_path));
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
  const images = await selectPhotoImages(photoId);
  await removeDraft(photoId, images.map((image) => image.storage_path));
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

interface EditablePhotoImageInput {
  bytes: Uint8Array;
  thumbnailBytes: Uint8Array;
  mimeType: string;
  thumbnailMimeType: string;
  width: number;
  height: number;
  capturedAt?: string;
}

function validateEditablePhotoImage(input: EditablePhotoImageInput) {
  if (
    !PHOTO_IMAGE_MIME_TYPES.includes(input.mimeType as PhotoImageMimeType)
    || input.thumbnailMimeType !== input.mimeType
    || input.bytes.byteLength < 1
    || input.bytes.byteLength > PHOTO_UPLOAD_LIMITS.maximumImageBytes
    || input.thumbnailBytes.byteLength < 1
    || input.thumbnailBytes.byteLength > PHOTO_UPLOAD_LIMITS.maximumImageBytes
    || !imageSignatureMatches(input.bytes, input.mimeType)
    || !imageSignatureMatches(input.thumbnailBytes, input.thumbnailMimeType)
  ) throw new PhotoServiceError("替换图片的格式、尺寸或大小无效。", 422);

  const dimensions = imageDimensionsFromBytes(input.bytes, input.mimeType);
  const thumbnailDimensions = imageDimensionsFromBytes(input.thumbnailBytes, input.thumbnailMimeType);
  if (
    !dimensions
    || dimensions.width < 1
    || dimensions.height < 1
    || dimensions.width > 50_000
    || dimensions.height > 50_000
    || !thumbnailDimensions
    || Math.max(thumbnailDimensions.width, thumbnailDimensions.height) > Math.max(dimensions.width, dimensions.height)
  ) throw new PhotoServiceError("替换图片的实际尺寸与提交信息不一致。", 422);

  let capturedAt: string | undefined;
  if (input.capturedAt) {
    const milliseconds = Date.parse(input.capturedAt);
    if (
      !Number.isFinite(milliseconds)
      || milliseconds < Date.UTC(1900, 0, 1)
      || milliseconds > Date.now() + 24 * 60 * 60 * 1_000
    ) throw new PhotoServiceError("图片的拍摄时间无效。", 422);
    capturedAt = new Date(milliseconds).toISOString();
  }
  return { width: dimensions.width, height: dimensions.height, capturedAt };
}

async function editablePhotoGroup(photoId: string) {
  const client = createServerSupabaseClient();
  const { data, error } = await client.from("photo_entries").select("*").eq("id", photoId).maybeSingle();
  if (error) throw new PhotoServiceError("无法读取照片记录。", 500);
  if (!data || data.status !== "ready") throw new PhotoServiceError("照片记录不存在或当前不可修改。", 404);
  return { client, photo: data as PhotoEntryRow };
}

export async function addPhotoImage(photoId: string, input: EditablePhotoImageInput) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const validated = validateEditablePhotoImage(input);
  const { client } = await editablePhotoGroup(photoId);
  const images = await selectPhotoImages(photoId);
  if (images.length >= PHOTO_UPLOAD_LIMITS.maximumImages) throw new PhotoServiceError("每组最多保存 12 张图片。", 409);
  if (images.reduce((total, image) => total + Number(image.byte_size), 0) + input.bytes.byteLength > PHOTO_UPLOAD_LIMITS.maximumGroupBytes) {
    throw new PhotoServiceError("单组图片总大小不能超过 60MB。", 413);
  }

  const imageId = randomUUID();
  const extension = extensionForPhotoMimeType(input.mimeType as PhotoImageMimeType);
  const storagePath = `photos/${photoId}/${imageId}.${extension}`;
  const thumbnailPath = photoThumbnailStoragePath(storagePath);
  try {
    await writeLocalPhotoFile(storagePath, input.bytes);
    await writeLocalPhotoFile(thumbnailPath, input.thumbnailBytes);
  } catch (error) {
    await deleteLocalPhotoFiles([storagePath, thumbnailPath]).catch(() => undefined);
    console.error("Unable to write a new photo image.", { photoId, imageId, error });
    throw new PhotoServiceError("无法写入新增图片，请检查图片存储目录。", 500);
  }

  const sortOrder = images.reduce((maximum, image) => Math.max(maximum, image.sort_order), -1) + 1;
  const { data, error } = await client.from("photo_images").insert({
    id: imageId,
    photo_entry_id: photoId,
    storage_path: storagePath,
    sort_order: sortOrder,
    width: validated.width,
    height: validated.height,
    mime_type: input.mimeType,
    byte_size: input.bytes.byteLength,
    captured_at: validated.capturedAt ?? null,
    legacy_path: false,
  }).select("*").single();
  if (error || !data) {
    await deleteLocalPhotoFiles([storagePath, thumbnailPath]).catch(() => undefined);
    throw new PhotoServiceError("无法保存新增图片。", 500);
  }
  return toImageViewModel(mapPhotoImage(data as PhotoImageRow));
}

export async function replacePhotoImage(photoId: string, imageId: string, input: EditablePhotoImageInput) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  assertUuid(imageId, "图片标识");
  const validated = validateEditablePhotoImage(input);
  const { client, photo } = await editablePhotoGroup(photoId);
  const { data: imageData, error: imageError } = await client.from("photo_images").select("*")
    .eq("id", imageId).eq("photo_entry_id", photoId).maybeSingle();
  if (imageError) throw new PhotoServiceError("无法读取待替换图片。", 500);
  if (!imageData) throw new PhotoServiceError("图片不存在。", 404);
  const image = imageData as PhotoImageRow;
  const images = await selectPhotoImages(photoId);
  const nextTotalBytes = images.reduce((total, item) => total + Number(item.byte_size), 0)
    - Number(image.byte_size) + input.bytes.byteLength;
  if (nextTotalBytes > PHOTO_UPLOAD_LIMITS.maximumGroupBytes) throw new PhotoServiceError("单组图片总大小不能超过 60MB。", 413);

  const extension = extensionForPhotoMimeType(input.mimeType as PhotoImageMimeType);
  const storagePath = `photos/${photoId}/${imageId}.${extension}`;
  const thumbnailPath = photoThumbnailStoragePath(storagePath);
  const replacesSameLocalPath = image.storage_path === storagePath && isLocalPhotoStoragePath(image.storage_path);
  const previousBytes = replacesSameLocalPath ? await readLocalPhotoFile(image.storage_path) : null;
  const previousThumbnailInfo = replacesSameLocalPath
    ? await getLocalPhotoFileInfo(photoThumbnailStoragePath(image.storage_path))
    : null;
  const previousThumbnailBytes = previousThumbnailInfo
    ? await readLocalPhotoFile(photoThumbnailStoragePath(image.storage_path))
    : null;

  const rollbackFiles = async () => {
    if (previousBytes) {
      await writeLocalPhotoFile(storagePath, previousBytes);
      if (previousThumbnailBytes) await writeLocalPhotoFile(thumbnailPath, previousThumbnailBytes);
      else await deleteLocalPhotoFiles([thumbnailPath]);
      return;
    }
    await deleteLocalPhotoFiles([storagePath, thumbnailPath]);
  };

  try {
    await writeLocalPhotoFile(storagePath, input.bytes);
    await writeLocalPhotoFile(thumbnailPath, input.thumbnailBytes);
  } catch (error) {
    await rollbackFiles().catch(() => undefined);
    console.error("Unable to write a replacement photo.", { photoId, error });
    throw new PhotoServiceError("无法写入替换图片，请检查图片存储目录。", 500);
  }

  const { data, error } = await client
    .from("photo_images")
    .update({
      storage_path: storagePath,
      width: validated.width,
      height: validated.height,
      mime_type: input.mimeType,
      byte_size: input.bytes.byteLength,
      captured_at: validated.capturedAt ?? image.captured_at,
      legacy_path: false,
    })
    .eq("id", imageId)
    .eq("photo_entry_id", photoId)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    await rollbackFiles().catch(() => undefined);
    throw new PhotoServiceError("无法保存替换图片。", 500);
  }

  if (photo.storage_path === image.storage_path) {
    await client.from("photo_entries").update({
      storage_path: storagePath,
      width: validated.width,
      height: validated.height,
      mime_type: input.mimeType,
      byte_size: input.bytes.byteLength,
      captured_at: validated.capturedAt ?? image.captured_at,
      legacy_record: false,
    }).eq("id", photoId);
  }
  if (image.storage_path !== storagePath) {
    await deletePhotoMedia([image.storage_path]).catch((cleanupError) => {
      console.error("Unable to remove the replaced photo media.", { photoId, imageId, cleanupError });
    });
  }
  return toImageViewModel(mapPhotoImage(data as PhotoImageRow));
}

export async function deletePhotoImage(photoId: string, imageId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  assertUuid(imageId, "图片标识");
  const { client, photo } = await editablePhotoGroup(photoId);
  const images = await selectPhotoImages(photoId);
  const image = images.find((item) => item.id === imageId);
  if (!image) throw new PhotoServiceError("图片不存在。", 404);
  if (images.length <= 1) throw new PhotoServiceError("每组至少保留一张图片；如需全部删除，请删除整组记录。", 409);
  const replacement = images.find((item) => item.id !== imageId)!;
  if (photo.storage_path === image.storage_path) {
    const { error: entryError } = await client.from("photo_entries").update({
      storage_path: replacement.storage_path,
      width: replacement.width,
      height: replacement.height,
      mime_type: replacement.mime_type,
      byte_size: replacement.byte_size,
      captured_at: replacement.captured_at,
      legacy_record: false,
    }).eq("id", photoId);
    if (entryError) throw new PhotoServiceError("无法更新照片组的封面图片。", 500);
  }
  const { data, error } = await client.from("photo_images").delete()
    .eq("id", imageId).eq("photo_entry_id", photoId).select("id").maybeSingle();
  if (error || !data) throw new PhotoServiceError("无法删除图片。", 500);
  await deletePhotoMedia([image.storage_path]).catch((cleanupError) => {
    console.error("Unable to remove deleted photo media.", { photoId, imageId, cleanupError });
  });
}

export async function deletePhoto(photoId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(photoId, "照片标识");
  const photo = await selectPhoto(photoId);
  if (!photo) throw new PhotoServiceError("照片不存在。", 404);
  if (photo.status !== "ready") throw new PhotoServiceError("这张照片当前不可删除。", 409);
  const images = await selectPhotoImages(photoId);
  const paths = [...images.map((image) => image.storage_path), photo.storage_path];

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
    await deletePhotoMedia(paths);
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
  imageId: string,
  variant: "original" | "thumbnail" = "original",
) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(imageId, "图片标识");
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_images")
    .select("storage_path,mime_type,byte_size,photo_entries!inner(status)")
    .eq("id", imageId)
    .eq("photo_entries.status", "ready")
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

export async function refreshPhotoImageUrl(imageId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(imageId, "图片标识");
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("photo_images")
    .select("storage_path,photo_entries!inner(status)")
    .eq("id", imageId)
    .eq("photo_entries.status", "ready")
    .maybeSingle();
  if (error && isMissingPhotoSchemaError(error)) {
    const legacy = await client
      .from("photo_entries")
      .select("storage_path")
      .eq("id", imageId)
      .maybeSingle();
    if (legacy.error) throw new PhotoServiceError("无法刷新图片地址。", 500);
    if (!legacy.data) throw new PhotoServiceError("照片不存在。", 404);
    return photoThumbnailUrl(imageId, (legacy.data as { storage_path: string }).storage_path);
  }
  if (error) throw new PhotoServiceError("无法刷新图片地址。", 500);
  if (!data) throw new PhotoServiceError("照片不存在。", 404);
  return photoThumbnailUrl(imageId, (data as { storage_path: string }).storage_path);
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
