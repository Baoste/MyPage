import "server-only";

import { randomUUID } from "node:crypto";
import { requirePrivateSession } from "@/lib/auth/session";
import {
  extensionForFoodMimeType,
  foodDateInTimezone,
  formatFoodLocation,
  type FoodUploadRequestInput,
} from "@/lib/food/contracts";
import { imageDimensionsFromBytes, imageSignatureMatches } from "@/lib/food/image-headers";
import { calculateFoodStatistics } from "@/lib/food/statistics";
import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createPrivateSignedUploadUrl,
  deletePrivateAssets,
  getPrivateSignedUrl,
  PRIVATE_DIARY_BUCKET,
} from "@/lib/supabase/storage";
import type {
  FoodGroup,
  FoodGroupRow,
  FoodGroupViewModel,
  FoodImage,
  FoodImageRow,
  FoodImageViewModel,
  FoodRating,
} from "@/types";

const STALE_DRAFT_MILLISECONDS = 24 * 60 * 60 * 1_000;
const MAXIMUM_IMAGE_HEADER_BYTES = 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UploadImageRow = Pick<
  FoodImageRow,
  | "id"
  | "food_entry_id"
  | "storage_path"
  | "sort_order"
  | "width"
  | "height"
  | "mime_type"
  | "byte_size"
  | "captured_at"
  | "legacy_path"
>;

interface LegacyFoodRow {
  id: string;
  name: string;
  storage_path: string;
  description: string | null;
  location: string | null;
  rating: number | null;
  food_date: string;
  created_at: string;
  updated_at: string;
}

export class FoodServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "FoodServiceError";
  }
}

function assertConfigured() {
  if (!isServerSupabaseConfigured()) {
    throw new FoodServiceError("美食记录暂时无法连接，请检查 Supabase 配置。", 503);
  }
}

function assertUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) throw new FoodServiceError(`${label}无效。`, 400);
}

function isMissingFoodSchemaError(error: { code?: string } | null) {
  return Boolean(error?.code && ["42703", "42P01", "PGRST204", "PGRST205"].includes(error.code));
}

function legacyFoodOccurredAt(foodDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(foodDate)
    ? `${foodDate}T04:00:00.000Z`
    : new Date(0).toISOString();
}

function legacyFoodMimeType(storagePath: string): FoodImage["mimeType"] {
  const normalized = storagePath.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function mapImage(row: FoodImageRow): FoodImage {
  return {
    id: row.id,
    foodGroupId: row.food_entry_id,
    storagePath: row.storage_path,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    capturedAt: row.captured_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGroup(row: FoodGroupRow, images: FoodImage[]): FoodGroup {
  const rating = row.rating && row.rating >= 1 && row.rating <= 5
    ? (row.rating as FoodRating)
    : undefined;
  return {
    id: row.id,
    category: row.category,
    review: row.review ?? undefined,
    rating,
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
    images,
    legacyRecord: row.legacy_record,
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

async function toImageViewModel(image: FoodImage): Promise<FoodImageViewModel> {
  try {
    return { ...image, imageUrl: await getPrivateSignedUrl(image.storagePath) };
  } catch (error) {
    console.error("Unable to sign one food image.", { imageId: image.id, error });
    return { ...image, imageUrl: "" };
  }
}

async function getLegacyFoodGroups(): Promise<FoodGroupViewModel[]> {
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("food_entries")
    .select("id,name,storage_path,description,location,rating,food_date,created_at,updated_at")
    .order("food_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load legacy food entries.");

  const groups = ((data ?? []) as LegacyFoodRow[]).map((row): FoodGroup => {
    const occurredAt = legacyFoodOccurredAt(row.food_date);
    const rating = row.rating && row.rating >= 1 && row.rating <= 5
      ? (row.rating as FoodRating)
      : undefined;
    return {
      id: row.id,
      category: row.name,
      review: row.description ?? undefined,
      rating,
      occurredAt,
      timezone: "Asia/Shanghai",
      location: {
        countryCode: "ZZ",
        countryName: "未指定",
        cityName: row.location?.trim() || "未指定",
      },
      images: [{
        id: row.id,
        foodGroupId: row.id,
        storagePath: row.storage_path,
        sortOrder: 0,
        width: 4,
        height: 3,
        mimeType: legacyFoodMimeType(row.storage_path),
        byteSize: 1,
        capturedAt: occurredAt,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }],
      legacyRecord: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
  const signedImages = await mapWithConcurrency(
    groups.map((group) => group.images[0]),
    6,
    toImageViewModel,
  );
  return groups.map((group, index) => ({ ...group, images: [signedImages[index]] }));
}

async function loadFoodGroups(): Promise<{
  groups: FoodGroupViewModel[];
  schemaReady: boolean;
}> {
  await requirePrivateSession();
  if (!isServerSupabaseConfigured()) return { groups: [], schemaReady: false };

  const client = createServerSupabaseClient();
  const { data: groupData, error: groupError } = await client
    .from("food_entries")
    .select("*")
    .eq("status", "ready")
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (groupError) {
    if (isMissingFoodSchemaError(groupError)) {
      return { groups: await getLegacyFoodGroups(), schemaReady: false };
    }
    throw new Error("Unable to load food groups.");
  }

  const rows = (groupData ?? []) as FoodGroupRow[];
  if (rows.length === 0) return { groups: [], schemaReady: true };
  const { data: imageData, error: imageError } = await client
    .from("food_images")
    .select("*")
    .in("food_entry_id", rows.map((row) => row.id))
    .order("sort_order", { ascending: true });
  if (imageError) {
    if (isMissingFoodSchemaError(imageError)) {
      throw new FoodServiceError("Food 数据库迁移不完整，请执行最新 Migration。", 503);
    }
    throw new Error("Unable to load food images.");
  }

  const imagesByGroup = new Map<string, FoodImage[]>();
  for (const row of (imageData ?? []) as FoodImageRow[]) {
    const image = mapImage(row);
    const images = imagesByGroup.get(image.foodGroupId) ?? [];
    images.push(image);
    imagesByGroup.set(image.foodGroupId, images);
  }

  const groups = rows.map((row) => mapGroup(row, imagesByGroup.get(row.id) ?? []));
  const allImages = groups.flatMap((group) => group.images);
  const viewImages = await mapWithConcurrency(allImages, 6, toImageViewModel);
  const viewById = new Map(viewImages.map((image) => [image.id, image]));
  return {
    schemaReady: true,
    groups: groups.map((group) => ({
      ...group,
      images: group.images.map((image) => viewById.get(image.id) ?? { ...image, imageUrl: "" }),
    })),
  };
}

export async function getFoodGroups(): Promise<FoodGroupViewModel[]> {
  return (await loadFoodGroups()).groups;
}

export async function getFoodPageData() {
  const { groups, schemaReady } = await loadFoodGroups();
  return { groups, statistics: calculateFoodStatistics(groups), schemaReady };
}

async function selectDraft(groupId: string, requestId?: string) {
  const client = createServerSupabaseClient();
  let query = client.from("food_entries").select("*").eq("id", groupId);
  if (requestId) query = query.eq("upload_request_id", requestId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new FoodServiceError("无法读取上传草稿。", 500);
  return data as FoodGroupRow | null;
}

async function selectDraftImages(groupId: string) {
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("food_images")
    .select("*")
    .eq("food_entry_id", groupId)
    .order("sort_order", { ascending: true });
  if (error) throw new FoodServiceError("无法读取上传图片。", 500);
  return (data ?? []) as FoodImageRow[];
}

async function removeDraft(groupId: string, paths: string[]) {
  await deletePrivateAssets(paths);
  const client = createServerSupabaseClient();
  const { error } = await client
    .from("food_entries")
    .delete()
    .eq("id", groupId)
    .eq("status", "draft");
  if (error) throw new FoodServiceError("无法清理上传草稿。", 500);
}

async function cleanupStaleDrafts() {
  const client = createServerSupabaseClient();
  const boundary = new Date(Date.now() - STALE_DRAFT_MILLISECONDS).toISOString();
  const { data, error } = await client
    .from("food_entries")
    .select("id")
    .eq("status", "draft")
    .lt("created_at", boundary)
    .limit(10);
  if (error) return;

  for (const draft of (data ?? []) as Array<{ id: string }>) {
    try {
      const images = await selectDraftImages(draft.id);
      await removeDraft(draft.id, images.map((image) => image.storage_path));
    } catch (cleanupError) {
      console.error("Unable to clean a stale food draft.", { groupId: draft.id, cleanupError });
    }
  }
}

function descriptorsMatch(input: FoodUploadRequestInput, images: UploadImageRow[]) {
  return images.length === input.images.length && images.every((image, index) => {
    const expected = input.images[index];
    return image.sort_order === index
      && image.mime_type === expected.mimeType
      && image.byte_size === expected.byteSize
      && image.width === expected.width
      && image.height === expected.height;
  });
}

async function signedTargets(
  input: FoodUploadRequestInput,
  images: UploadImageRow[],
) {
  return mapWithConcurrency(images, 4, async (image) => {
    const signed = await createPrivateSignedUploadUrl(image.storage_path, { upsert: true });
    return {
      clientId: input.images[image.sort_order].clientId,
      imageId: image.id,
      storagePath: image.storage_path,
      signedUrl: signed.signedUrl,
    };
  });
}

export async function initializeFoodUpload(input: FoodUploadRequestInput) {
  await requirePrivateSession();
  assertConfigured();
  void cleanupStaleDrafts().catch((error) => {
    console.error("Unable to run food draft cleanup.", error);
  });

  const client = createServerSupabaseClient();
  const { data: existingData, error: existingError } = await client
    .from("food_entries")
    .select("*")
    .eq("upload_request_id", input.requestId)
    .maybeSingle();
  if (existingError) {
    if (isMissingFoodSchemaError(existingError)) {
      throw new FoodServiceError("请先执行最新 Food 数据库 Migration。", 503);
    }
    throw new FoodServiceError("无法初始化上传。", 500);
  }

  if (existingData) {
    const existing = existingData as FoodGroupRow;
    if (existing.status === "ready") {
      return { groupId: existing.id, requestId: input.requestId, uploads: [], alreadyComplete: true };
    }
    const images = await selectDraftImages(existing.id);
    if (!descriptorsMatch(input, images)) {
      throw new FoodServiceError("这个上传请求已被其他内容使用，请重新打开上传面板。", 409);
    }
    return {
      groupId: existing.id,
      requestId: input.requestId,
      uploads: await signedTargets(input, images),
      alreadyComplete: false,
    };
  }

  const groupId = randomUUID();
  const imageRows: UploadImageRow[] = input.images.map((image, index) => {
    const imageId = randomUUID();
    const extension = extensionForFoodMimeType(image.mimeType);
    return {
      id: imageId,
      food_entry_id: groupId,
      storage_path: `food/${groupId}/${imageId}.${extension}`,
      sort_order: index,
      width: image.width,
      height: image.height,
      mime_type: image.mimeType,
      byte_size: image.byteSize,
      captured_at: image.capturedAt ?? null,
      legacy_path: false,
    };
  });
  const locationText = formatFoodLocation(input.location);
  const { error: groupError } = await client.from("food_entries").insert({
    id: groupId,
    name: input.category,
    storage_path: imageRows[0].storage_path,
    description: input.review ?? null,
    restaurant: null,
    location: locationText,
    rating: input.rating,
    food_date: foodDateInTimezone(input.occurredAt, input.timezone),
    tags: [],
    category: input.category,
    review: input.review ?? null,
    occurred_at: input.occurredAt,
    timezone: input.timezone,
    location_country_code: input.location.countryCode,
    location_country_name: input.location.countryName,
    location_region_code: input.location.regionCode ?? null,
    location_region_name: input.location.regionName ?? null,
    location_city_code: input.location.cityCode ?? null,
    location_city_name: input.location.cityName,
    status: "draft",
    upload_request_id: input.requestId,
    legacy_record: false,
  });
  if (groupError) throw new FoodServiceError("无法创建上传草稿。", 500);

  const { error: imagesError } = await client.from("food_images").insert(imageRows);
  if (imagesError) {
    await client.from("food_entries").delete().eq("id", groupId);
    throw new FoodServiceError("无法创建图片记录。", 500);
  }

  try {
    return {
      groupId,
      requestId: input.requestId,
      uploads: await signedTargets(input, imageRows),
      alreadyComplete: false,
    };
  } catch {
    await client.from("food_entries").delete().eq("id", groupId);
    throw new FoodServiceError("无法创建图片上传地址。", 500);
  }
}

async function verifyUploadedImages(groupId: string, images: FoodImageRow[]) {
  const client = createServerSupabaseClient();
  const folder = `food/${groupId}`;
  const { data, error } = await client.storage.from(PRIVATE_DIARY_BUCKET).list(folder, { limit: 100 });
  if (error) throw new FoodServiceError("无法核对已上传图片。", 500);
  const objects = new Map((data ?? []).map((item) => [item.name, item]));

  await mapWithConcurrency(images, 3, async (image) => {
    const name = image.storage_path.slice(folder.length + 1);
    const object = objects.get(name);
    const metadata = object?.metadata as { size?: number; mimetype?: string } | undefined;
    if (!object || metadata?.size !== image.byte_size || metadata?.mimetype !== image.mime_type) {
      throw new FoodServiceError("上传后的图片信息与选择时不一致。", 422);
    }
    const signedUrl = await getPrivateSignedUrl(image.storage_path);
    const response = await fetch(signedUrl, {
      headers: { Range: `bytes=0-${MAXIMUM_IMAGE_HEADER_BYTES - 1}` },
      cache: "no-store",
    });
    if (!response.ok) throw new FoodServiceError("无法读取已上传图片。", 422);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!imageSignatureMatches(bytes, image.mime_type)) {
      throw new FoodServiceError("图片文件内容与格式不一致。", 422);
    }
    const dimensions = imageDimensionsFromBytes(bytes, image.mime_type);
    if (!dimensions || dimensions.width !== image.width || dimensions.height !== image.height) {
      throw new FoodServiceError("上传后的图片尺寸与选择时不一致。", 422);
    }
  });
}

export async function completeFoodUpload(groupId: string, requestId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(groupId, "美食组标识");
  assertUuid(requestId, "上传请求标识");

  const group = await selectDraft(groupId, requestId);
  if (!group) throw new FoodServiceError("上传草稿不存在或已经过期。", 404);
  if (group.status === "ready") return { groupId };
  const images = await selectDraftImages(groupId);
  if (images.length < 1 || images.length > 12) {
    throw new FoodServiceError("上传草稿中的图片数量无效。", 422);
  }

  try {
    await verifyUploadedImages(groupId, images);
  } catch (error) {
    try {
      await removeDraft(groupId, images.map((image) => image.storage_path));
    } catch (cleanupError) {
      console.error("Unable to roll back an invalid food upload.", { groupId, cleanupError });
    }
    throw error;
  }

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("food_entries")
    .update({ status: "ready" })
    .eq("id", groupId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error || !data) throw new FoodServiceError("无法完成美食记录。", 500);
  return { groupId };
}

export async function cancelFoodUpload(groupId: string, requestId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(groupId, "美食组标识");
  assertUuid(requestId, "上传请求标识");
  const group = await selectDraft(groupId, requestId);
  if (!group || group.status === "ready") return;
  const images = await selectDraftImages(groupId);
  await removeDraft(groupId, images.map((image) => image.storage_path));
}

export async function refreshFoodImageUrl(imageId: string) {
  await requirePrivateSession();
  assertConfigured();
  assertUuid(imageId, "图片标识");
  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("food_images")
    .select("storage_path, food_entries!inner(status)")
    .eq("id", imageId)
    .eq("food_entries.status", "ready")
    .maybeSingle();
  if (error) {
    if (isMissingFoodSchemaError(error)) {
      const { data: legacyData, error: legacyError } = await client
        .from("food_entries")
        .select("storage_path")
        .eq("id", imageId)
        .maybeSingle();
      if (legacyError) throw new FoodServiceError("无法刷新图片地址。", 500);
      if (!legacyData) throw new FoodServiceError("图片不存在。", 404);
      return getPrivateSignedUrl((legacyData as { storage_path: string }).storage_path);
    }
    throw new FoodServiceError("无法刷新图片地址。", 500);
  }
  if (!data) throw new FoodServiceError("图片不存在。", 404);
  return getPrivateSignedUrl((data as { storage_path: string }).storage_path);
}
