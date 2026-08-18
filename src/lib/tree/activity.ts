import type { PhotoActivityStats } from "@/types";

const DAY_IN_MILLISECONDS = 86_400_000;
export const PHOTO_FULL_DENSITY_DAYS = 21;
export const PHOTO_ZERO_DENSITY_DAYS = 40;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculatePhotoVitality(daysSinceLastUpload: number | null) {
  if (daysSinceLastUpload === null || !Number.isFinite(daysSinceLastUpload)) return 0;

  const safeDays = Math.max(0, daysSinceLastUpload);
  if (safeDays <= PHOTO_FULL_DENSITY_DAYS) return 1;
  if (safeDays >= PHOTO_ZERO_DENSITY_DAYS) return 0;

  const progress =
    (safeDays - PHOTO_FULL_DENSITY_DAYS) /
    (PHOTO_ZERO_DENSITY_DAYS - PHOTO_FULL_DENSITY_DAYS);
  return clamp(1 - progress ** 3, 0, 1);
}

export function daysBetween(now: Date, earlier: Date) {
  const difference = now.getTime() - earlier.getTime();
  return Math.max(0, difference / DAY_IN_MILLISECONDS);
}

export function createPhotoActivityStats(daysSinceLastUpload: number | null): PhotoActivityStats {
  return {
    daysSinceLastUpload,
    vitality: calculatePhotoVitality(daysSinceLastUpload),
    status: daysSinceLastUpload === null ? "empty" : "live",
  };
}

export const unavailablePhotoActivity: PhotoActivityStats = {
  daysSinceLastUpload: null,
  vitality: 0,
  status: "unavailable",
};
