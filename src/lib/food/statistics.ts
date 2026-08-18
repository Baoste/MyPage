import type {
  FoodGroupViewModel,
  FoodRankingItem,
  FoodStatistics,
} from "@/types";
import { FOOD_TIMEZONE } from "@/lib/food/contracts";

function localDateParts(value: string | number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { year: find("year"), month: find("month"), day: find("day") };
}

function localDayNumber(value: string | number, timezone: string) {
  const parts = localDateParts(value, timezone);
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

function ranking(
  values: Array<{ key: string; label: string }>,
  total: number,
  maximum = 10,
): FoodRankingItem[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const current = counts.get(value.key);
    counts.set(value.key, {
      label: current?.label ?? value.label,
      count: (current?.count ?? 0) + 1,
    });
  }

  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      count: value.count,
      percentage: total > 0 ? Math.round((value.count / total) * 1_000) / 10 : 0,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN"))
    .slice(0, maximum);
}

export function calculateFoodStatistics(
  groups: FoodGroupViewModel[],
  nowMilliseconds = Date.now(),
): FoodStatistics {
  const groupCount = groups.length;
  const imageCount = groups.reduce((total, group) => total + group.images.length, 0);
  const ratedGroups = groups.filter((group) => group.rating !== undefined);
  const ratingsTotal = ratedGroups.reduce((total, group) => total + (group.rating ?? 0), 0);
  const firstGroup = [...groups].sort(
    (left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt),
  )[0];
  const recentBoundary = nowMilliseconds - 365 * 24 * 60 * 60 * 1_000;
  const recentGroups = groups.filter((group) => Date.parse(group.occurredAt) >= recentBoundary);
  const categoryRanking = ranking(
    groups.map((group) => ({ key: group.category.toLocaleLowerCase("zh-CN"), label: group.category })),
    groupCount,
  );
  const validCountries = groups.filter((group) => group.location.countryCode !== "ZZ");
  const countryRanking = ranking(
    validCountries.map((group) => ({
      key: group.location.countryCode,
      label: group.location.countryName,
    })),
    validCountries.length,
  );
  const validCities = groups.filter((group) => group.location.cityName !== "未指定");
  const cityRanking = ranking(
    validCities.map((group) => ({
      key: `${group.location.countryCode}:${group.location.cityCode ?? group.location.cityName.toLocaleLowerCase("zh-CN")}`,
      label: group.location.cityName,
    })),
    validCities.length,
  );
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = ratedGroups.filter((group) => group.rating === rating).length;
    return {
      key: String(rating),
      label: `${rating} 星`,
      count,
      percentage: ratedGroups.length > 0 ? Math.round((count / ratedGroups.length) * 1_000) / 10 : 0,
    };
  });

  const nowParts = localDateParts(nowMilliseconds, FOOD_TIMEZONE);
  const monthlyTimeline = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(
      Number(nowParts.year),
      Number(nowParts.month) - 1 - (11 - index),
      1,
    ));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, label: `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`, count: 0 };
  });
  const monthlyMap = new Map(monthlyTimeline.map((item) => [item.key, item]));
  for (const group of groups) {
    const parts = localDateParts(group.occurredAt, group.timezone);
    const item = monthlyMap.get(`${parts.year}-${parts.month}`);
    if (item) item.count += 1;
  }

  const todayMemories = groups
    .filter((group) => {
      const occurred = localDateParts(group.occurredAt, group.timezone);
      const today = localDateParts(nowMilliseconds, group.timezone);
      return occurred.year !== today.year && occurred.month === today.month && occurred.day === today.day;
    })
    .map((group) => ({
      id: group.id,
      category: group.category,
      occurredAt: group.occurredAt,
      cityName: group.location.cityName,
    }));

  const categoryKeys = new Set(groups.map((group) => group.category.toLocaleLowerCase("zh-CN")));
  const countryKeys = new Set(validCountries.map((group) => group.location.countryCode));
  const cityKeys = new Set(
    validCities.map((group) =>
      `${group.location.countryCode}:${group.location.cityCode ?? group.location.cityName.toLocaleLowerCase("zh-CN")}`,
    ),
  );

  return {
    groupCount,
    imageCount,
    uniqueCategoryCount: categoryKeys.size,
    countryCount: countryKeys.size,
    cityCount: cityKeys.size,
    averageRating: ratedGroups.length > 0 ? Math.round((ratingsTotal / ratedGroups.length) * 10) / 10 : null,
    fiveStarCount: ratedGroups.filter((group) => group.rating === 5).length,
    firstRecordedAt: firstGroup?.occurredAt ?? null,
    daysSinceFirst: firstGroup
      ? Math.max(0, Math.floor((
        localDayNumber(nowMilliseconds, FOOD_TIMEZONE)
        - localDayNumber(firstGroup.occurredAt, firstGroup.timezone)
      ) / 86_400_000))
      : null,
    recentYearGroupCount: recentGroups.length,
    recentYearImageCount: recentGroups.reduce((total, group) => total + group.images.length, 0),
    categoryRanking,
    countryRanking,
    cityRanking,
    ratingDistribution,
    monthlyTimeline,
    todayMemories,
  };
}
