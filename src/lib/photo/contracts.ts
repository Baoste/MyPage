import type { FoodLocation, PhotoImageMimeType } from "@/types";

export const PHOTO_UPLOAD_LIMITS = {
  maximumImageBytes: 10 * 1024 * 1024,
  maximumTitleLength: 120,
  maximumDescriptionLength: 2000,
  maximumTags: 20,
  maximumTagLength: 30,
} as const;

export const PHOTO_TIMEZONE = "Asia/Shanghai";
export const PHOTO_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const satisfies readonly PhotoImageMimeType[];

export interface PhotoUpdateInput {
  title?: string;
  description?: string;
  occurredAt: string;
  timezone: typeof PHOTO_TIMEZONE;
  location: FoodLocation;
  tags: string[];
}

export interface PhotoUploadRequestInput extends PhotoUpdateInput {
  requestId: string;
  clientId: string;
  width: number;
  height: number;
  byteSize: number;
  mimeType: PhotoImageMimeType;
  capturedAt?: string;
}

export interface PhotoUploadTarget {
  clientId: string;
  photoId: string;
  storagePath: string;
  uploadUrl: string;
}

export interface PhotoUploadIntentResponse {
  ok: true;
  photoId: string;
  requestId: string;
  upload?: PhotoUploadTarget;
  alreadyComplete: boolean;
}

export interface PhotoApiErrorResponse {
  ok: false;
  message: string;
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LOCATION_CODE_PATTERN = /^[a-z0-9:_-]{2,80}$/iu;
const CHINESE_LOCATION_PATTERN = /^\p{Script=Han}+$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalText(value: unknown, maximumLength: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/gu, " ");
  return cleaned && cleaned.length <= maximumLength ? cleaned : null;
}

function optionalDescription(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n?/gu, "\n").trim();
  return cleaned.length <= PHOTO_UPLOAD_LIMITS.maximumDescriptionLength
    ? cleaned || undefined
    : null;
}

function validDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const milliseconds = Date.parse(value);
  const earliest = Date.UTC(1900, 0, 1);
  const latest = Date.now() + 24 * 60 * 60 * 1_000;
  return Number.isFinite(milliseconds) && milliseconds >= earliest && milliseconds <= latest
    ? new Date(milliseconds).toISOString()
    : null;
}

function validLocation(value: unknown): FoodLocation | null {
  if (!isRecord(value)) return null;
  const countryCode = typeof value.countryCode === "string"
    ? value.countryCode.trim().toUpperCase()
    : "";
  const countryName = optionalText(value.countryName, 100);
  const regionCode = optionalText(value.regionCode, 80);
  const regionName = optionalText(value.regionName, 100);
  const cityCode = optionalText(value.cityCode, 80);
  const cityName = optionalText(value.cityName, 100);

  if (
    !LOCATION_CODE_PATTERN.test(countryCode)
    || !countryName
    || !cityName
    || !CHINESE_LOCATION_PATTERN.test(countryName)
    || !CHINESE_LOCATION_PATTERN.test(cityName)
    || regionCode === null
    || regionName === null
    || cityCode === null
    || (regionCode && !LOCATION_CODE_PATTERN.test(regionCode))
    || (cityCode && !LOCATION_CODE_PATTERN.test(cityCode))
    || (regionName && !CHINESE_LOCATION_PATTERN.test(regionName))
  ) return null;

  return {
    countryCode,
    countryName,
    regionCode,
    regionName,
    cityCode,
    cityName,
  };
}

function validTags(value: unknown) {
  if (!Array.isArray(value) || value.length > PHOTO_UPLOAD_LIMITS.maximumTags) return null;
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const tag = item.trim().replace(/\s+/gu, " ");
    if (!tag || tag.length > PHOTO_UPLOAD_LIMITS.maximumTagLength) return null;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function validatePhotoUpdateRequest(value: unknown): ValidationResult<PhotoUpdateInput> {
  if (!isRecord(value)) return { ok: false, message: "提交内容格式不正确。" };
  const title = optionalText(value.title, PHOTO_UPLOAD_LIMITS.maximumTitleLength);
  const description = optionalDescription(value.description);
  const occurredAt = validDateTime(value.occurredAt);
  const location = validLocation(value.location);
  const tags = validTags(value.tags);

  if (title === null) return { ok: false, message: "标题不能超过 120 个字符。" };
  if (description === null) return { ok: false, message: "描述不能超过 2000 个字符。" };
  if (!occurredAt || value.timezone !== PHOTO_TIMEZONE) {
    return { ok: false, message: "拍摄时间或时区无效。" };
  }
  if (!location) return { ok: false, message: "请选择完整的中文国家和城市。" };
  if (!tags) return { ok: false, message: "标签最多 20 个，每个最多 30 个字符。" };

  return {
    ok: true,
    value: { title, description, occurredAt, timezone: PHOTO_TIMEZONE, location, tags },
  };
}

export function validatePhotoUploadRequest(
  value: unknown,
): ValidationResult<PhotoUploadRequestInput> {
  const metadata = validatePhotoUpdateRequest(value);
  if (!metadata.ok) return metadata;
  if (!isRecord(value)) return { ok: false, message: "提交内容格式不正确。" };

  const requestId = typeof value.requestId === "string" ? value.requestId : "";
  const clientId = typeof value.clientId === "string" ? value.clientId : "";
  const mimeType = typeof value.mimeType === "string" ? value.mimeType : "";
  const capturedAt = value.capturedAt === undefined ? undefined : validDateTime(value.capturedAt);
  if (!UUID_PATTERN.test(requestId) || !UUID_PATTERN.test(clientId)) {
    return { ok: false, message: "上传请求标识无效。" };
  }
  if (
    !PHOTO_IMAGE_MIME_TYPES.includes(mimeType as PhotoImageMimeType)
    || !Number.isInteger(value.width)
    || !Number.isInteger(value.height)
    || !Number.isInteger(value.byteSize)
    || (value.width as number) <= 0
    || (value.height as number) <= 0
    || (value.width as number) > 50_000
    || (value.height as number) > 50_000
    || (value.byteSize as number) <= 0
    || (value.byteSize as number) > PHOTO_UPLOAD_LIMITS.maximumImageBytes
    || (value.capturedAt !== undefined && !capturedAt)
  ) return { ok: false, message: "图片类型、尺寸或大小不符合要求。" };

  return {
    ok: true,
    value: {
      ...metadata.value,
      requestId,
      clientId,
      width: value.width as number,
      height: value.height as number,
      byteSize: value.byteSize as number,
      mimeType: mimeType as PhotoImageMimeType,
      capturedAt: capturedAt ?? undefined,
    },
  };
}

export function extensionForPhotoMimeType(mimeType: PhotoImageMimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function formatPhotoLocation(location: FoodLocation) {
  return [location.countryName, location.regionName, location.cityName]
    .filter((part, index, items) => Boolean(part) && items.indexOf(part) === index)
    .join(" · ");
}

export function photoDateInTimezone(occurredAt: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(occurredAt));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

