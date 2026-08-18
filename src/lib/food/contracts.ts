import type { FoodLocation, FoodRating } from "@/types";

export const FOOD_UPLOAD_LIMITS = {
  maximumImages: 12,
  maximumImageBytes: 10 * 1024 * 1024,
  maximumGroupBytes: 60 * 1024 * 1024,
  maximumCategoryLength: 40,
  maximumReviewLength: 2_000,
} as const;

export const FOOD_TIMEZONE = "Asia/Shanghai";

export const FOOD_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type FoodImageMimeType = (typeof FOOD_IMAGE_MIME_TYPES)[number];

export interface FoodUploadImageInput {
  clientId: string;
  width: number;
  height: number;
  mimeType: FoodImageMimeType;
  byteSize: number;
  capturedAt?: string;
}

export interface FoodUploadRequestInput {
  requestId: string;
  category: string;
  review?: string;
  rating: FoodRating;
  occurredAt: string;
  timezone: string;
  location: FoodLocation;
  images: FoodUploadImageInput[];
}

export interface FoodUploadTarget {
  clientId: string;
  imageId: string;
  storagePath: string;
  signedUrl: string;
}

export interface FoodUploadIntentResponse {
  ok: true;
  groupId: string;
  requestId: string;
  uploads: FoodUploadTarget[];
  alreadyComplete: boolean;
}

export interface FoodUploadCompleteResponse {
  ok: true;
  groupId: string;
}

export interface FoodApiErrorResponse {
  ok: false;
  message: string;
}

export interface FoodValidationResult {
  ok: true;
  value: FoodUploadRequestInput;
}

export interface FoodValidationError {
  ok: false;
  message: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCATION_CODE_PATTERN = /^[a-z0-9:_-]{2,80}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/gu, " ");
  return cleaned && cleaned.length <= maximumLength ? cleaned : null;
}

function optionalText(value: unknown, maximumLength: number) {
  if (value === undefined || value === null || value === "") return undefined;
  return cleanText(value, maximumLength) ?? null;
}

function optionalReview(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n?/gu, "\n").trim();
  return cleaned.length <= FOOD_UPLOAD_LIMITS.maximumReviewLength ? cleaned || undefined : null;
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

function validTimezone(value: unknown) {
  return value === FOOD_TIMEZONE ? FOOD_TIMEZONE : null;
}

function validLocation(value: unknown): FoodLocation | null {
  if (!isRecord(value)) return null;
  const countryCode = cleanText(value.countryCode, 32)?.toUpperCase();
  const countryName = cleanText(value.countryName, 100);
  const regionName = optionalText(value.regionName, 100);
  const cityName = cleanText(value.cityName, 100);
  const regionCode = optionalText(value.regionCode, 80);
  const cityCode = optionalText(value.cityCode, 80);

  if (
    !countryCode ||
    !LOCATION_CODE_PATTERN.test(countryCode) ||
    !countryName ||
    !cityName ||
    regionName === null ||
    regionCode === null ||
    cityCode === null ||
    (regionCode && !LOCATION_CODE_PATTERN.test(regionCode)) ||
    (cityCode && !LOCATION_CODE_PATTERN.test(cityCode))
  ) {
    return null;
  }

  return {
    countryCode,
    countryName,
    regionCode,
    regionName,
    cityCode,
    cityName,
  };
}

function validImage(value: unknown): FoodUploadImageInput | null {
  if (!isRecord(value)) return null;
  const clientId = typeof value.clientId === "string" ? value.clientId : "";
  const mimeType = typeof value.mimeType === "string" ? value.mimeType : "";
  const capturedAt = value.capturedAt === undefined ? undefined : validDateTime(value.capturedAt);

  if (
    !UUID_PATTERN.test(clientId) ||
    !FOOD_IMAGE_MIME_TYPES.includes(mimeType as FoodImageMimeType) ||
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    !Number.isInteger(value.byteSize) ||
    (value.width as number) <= 0 ||
    (value.height as number) <= 0 ||
    (value.width as number) > 50_000 ||
    (value.height as number) > 50_000 ||
    (value.byteSize as number) <= 0 ||
    (value.byteSize as number) > FOOD_UPLOAD_LIMITS.maximumImageBytes ||
    (value.capturedAt !== undefined && !capturedAt)
  ) {
    return null;
  }

  return {
    clientId,
    width: value.width as number,
    height: value.height as number,
    byteSize: value.byteSize as number,
    mimeType: mimeType as FoodImageMimeType,
    capturedAt: capturedAt ?? undefined,
  };
}

export function validateFoodUploadRequest(value: unknown): FoodValidationResult | FoodValidationError {
  if (!isRecord(value)) return { ok: false, message: "提交内容格式不正确。" };

  const requestId = typeof value.requestId === "string" ? value.requestId : "";
  const category = cleanText(value.category, FOOD_UPLOAD_LIMITS.maximumCategoryLength);
  const review = optionalReview(value.review);
  const rating = value.rating;
  const occurredAt = validDateTime(value.occurredAt);
  const timezone = validTimezone(value.timezone);
  const location = validLocation(value.location);
  const rawImages = Array.isArray(value.images) ? value.images : [];

  if (!UUID_PATTERN.test(requestId)) return { ok: false, message: "上传请求标识无效。" };
  if (!category) return { ok: false, message: "分类需要填写 1～40 个字符。" };
  if (review === null) return { ok: false, message: "点评不能超过 2000 个字符。" };
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
    return { ok: false, message: "请选择 1～5 星评分。" };
  }
  if (!occurredAt || !timezone) return { ok: false, message: "发生时间或时区无效。" };
  if (!location) return { ok: false, message: "请完整填写国家和城市。" };
  if (rawImages.length < 1 || rawImages.length > FOOD_UPLOAD_LIMITS.maximumImages) {
    return { ok: false, message: "每组需要选择 1～12 张图片。" };
  }

  const images = rawImages.map(validImage);
  if (images.some((image) => image === null)) {
    return { ok: false, message: "图片类型、尺寸或大小不符合要求。" };
  }
  const safeImages = images as FoodUploadImageInput[];
  if (new Set(safeImages.map((image) => image.clientId)).size !== safeImages.length) {
    return { ok: false, message: "图片标识重复，请重新选择图片。" };
  }
  if (safeImages.reduce((total, image) => total + image.byteSize, 0) > FOOD_UPLOAD_LIMITS.maximumGroupBytes) {
    return { ok: false, message: "单组图片总大小不能超过 60MB。" };
  }

  return {
    ok: true,
    value: {
      requestId,
      category,
      review,
      rating: rating as FoodRating,
      occurredAt,
      timezone,
      location,
      images: safeImages,
    },
  };
}

export function extensionForFoodMimeType(mimeType: FoodImageMimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function formatFoodLocation(location: FoodLocation) {
  return [location.countryName, location.regionName, location.cityName]
    .filter((part, index, items) => Boolean(part) && items.indexOf(part) === index)
    .join(" · ");
}

export function foodDateInTimezone(occurredAt: string, timezone: string) {
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
