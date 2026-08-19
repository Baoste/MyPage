import { PHOTO_TIMEZONE } from "@/lib/photo/contracts";
import type { PhotoRankingItem, PhotoStatistics, PhotoViewModel } from "@/types";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;

function localParts(value: string | number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHOTO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

function localDayNumber(value: string | number) {
  const { year, month, day } = localParts(value);
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_MILLISECONDS;
}

function ranking(values: Array<{ key: string; label: string }>, total: number) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const current = counts.get(value.key);
    counts.set(value.key, { label: value.label, count: (current?.count ?? 0) + 1 });
  }
  return [...counts.entries()]
    .map(([key, item]): PhotoRankingItem => ({
      key,
      label: item.label,
      count: item.count,
      percentage: total ? Math.round((item.count / total) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN"));
}

export function calculatePhotoStatistics(
  photos: PhotoViewModel[],
  now = new Date(),
): PhotoStatistics {
  const validCountries = photos.filter((photo) => photo.location.countryCode !== "ZZ");
  const validCities = photos.filter((photo) => photo.location.cityName !== "未指定");
  const tags = photos.flatMap((photo) => photo.tags.map((tag) => ({
    key: tag.toLocaleLowerCase("zh-CN"),
    label: tag,
  })));
  const timestamps = photos
    .map((photo) => Date.parse(photo.occurredAt))
    .filter(Number.isFinite);
  const firstTimestamp = timestamps.length ? Math.min(...timestamps) : null;
  const recentBoundary = now.getTime() - 365 * DAY_MILLISECONDS;

  const currentParts = localParts(now.getTime());
  const monthKeys: string[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(Number(currentParts.year), Number(currentParts.month) - 1 - offset, 1));
    monthKeys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const monthlyCounts = new Map(monthKeys.map((key) => [key, 0]));
  for (const photo of photos) {
    const parts = localParts(photo.occurredAt);
    const key = `${parts.year}-${parts.month}`;
    if (monthlyCounts.has(key)) monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
  }

  const todayMemories = photos
    .filter((photo) => {
      const parts = localParts(photo.occurredAt);
      return parts.month === currentParts.month
        && parts.day === currentParts.day
        && parts.year !== currentParts.year;
    })
    .map((photo) => ({
      id: photo.id,
      title: photo.title ?? "无题",
      occurredAt: photo.occurredAt,
      cityName: photo.location.cityName,
    }));

  return {
    photoCount: photos.length,
    countryCount: new Set(validCountries.map((photo) => photo.location.countryCode)).size,
    cityCount: new Set(validCities.map((photo) =>
      `${photo.location.countryCode}:${photo.location.cityCode ?? photo.location.cityName}`)).size,
    uniqueTagCount: new Set(tags.map((tag) => tag.key)).size,
    describedCount: photos.filter((photo) => Boolean(photo.description)).length,
    firstRecordedAt: firstTimestamp === null ? null : new Date(firstTimestamp).toISOString(),
    daysSinceFirst: firstTimestamp === null
      ? null
      : Math.max(0, Math.floor(localDayNumber(now.getTime()) - localDayNumber(firstTimestamp))),
    recentYearCount: photos.filter((photo) => Date.parse(photo.occurredAt) >= recentBoundary).length,
    countryRanking: ranking(validCountries.map((photo) => ({
      key: photo.location.countryCode,
      label: photo.location.countryName,
    })), validCountries.length),
    cityRanking: ranking(validCities.map((photo) => ({
      key: `${photo.location.countryCode}:${photo.location.cityCode ?? photo.location.cityName}`,
      label: photo.location.cityName,
    })), validCities.length),
    tagRanking: ranking(tags, tags.length),
    monthlyTimeline: monthKeys.map((key) => ({ key, label: key, count: monthlyCounts.get(key) ?? 0 })),
    todayMemories,
  };
}

