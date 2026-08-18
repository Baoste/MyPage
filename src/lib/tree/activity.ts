import type { PhotoActivityStats } from "@/types";

const DAY_IN_MILLISECONDS = 86_400_000;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculatePhotoVitality(
  uploadsLast30Days: number,
  daysSinceLastUpload: number | null,
) {
  const safeUploads = Math.max(0, Math.floor(uploadsLast30Days));
  const frequency = clamp(safeUploads / 8, 0, 1);

  let recency: number;
  if (daysSinceLastUpload === null || !Number.isFinite(daysSinceLastUpload)) {
    recency = 0.12;
  } else if (daysSinceLastUpload <= 30) {
    recency = 1;
  } else {
    recency = Math.max(0.12, Math.exp(-(daysSinceLastUpload - 30) / 60));
  }

  return clamp((0.35 + 0.65 * frequency) * recency, 0.08, 1);
}

export function daysBetween(now: Date, earlier: Date) {
  const difference = now.getTime() - earlier.getTime();
  return Math.max(0, difference / DAY_IN_MILLISECONDS);
}

export function createPhotoActivityStats(
  uploadsLast30Days: number,
  daysSinceLastUpload: number | null,
): PhotoActivityStats {
  const safeUploads = Math.max(0, Math.floor(uploadsLast30Days));

  return {
    uploadsLast30Days: safeUploads,
    daysSinceLastUpload,
    vitality: calculatePhotoVitality(safeUploads, daysSinceLastUpload),
    status: daysSinceLastUpload === null ? "empty" : "live",
  };
}

export const unavailablePhotoActivity: PhotoActivityStats = {
  uploadsLast30Days: 0,
  daysSinceLastUpload: null,
  vitality: 0.62,
  status: "unavailable",
};
