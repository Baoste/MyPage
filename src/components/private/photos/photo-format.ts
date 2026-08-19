import type { PhotoViewModel } from "@/types";

export function formatPhotoDateTime(photo: PhotoViewModel) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: photo.timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(photo.occurredAt));
  } catch {
    return photo.date;
  }
}

export function formatPhotoShortDate(photo: PhotoViewModel) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: photo.timezone,
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(photo.occurredAt));
  } catch {
    return photo.date.slice(5);
  }
}

export function photoLocationLabel(photo: PhotoViewModel) {
  return [
    photo.location.countryName,
    photo.location.regionName,
    photo.location.cityName,
  ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index).join(" · ");
}

