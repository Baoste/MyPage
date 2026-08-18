import type { FoodGroupViewModel } from "@/types";

export function formatFoodDateTime(group: FoodGroupViewModel) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: group.timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(group.occurredAt));
  } catch {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(group.occurredAt));
  }
}

export function foodLocationLabel(group: FoodGroupViewModel) {
  return [
    group.location.countryName,
    group.location.regionName,
    group.location.cityName,
  ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index).join(" · ");
}
