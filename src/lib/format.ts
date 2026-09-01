export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(date);
}
