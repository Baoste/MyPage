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

const PROJECT_PERIOD_PATTERN = /^(\d{4})-(\d{2}) - (\d{4})-(\d{2})$/u;

export function formatProjectPeriod(value: string) {
  const match = PROJECT_PERIOD_PATTERN.exec(value);
  if (!match) return value;

  const start = `${match[1]}年${match[2]}月`;
  const end = `${match[3]}年${match[4]}月`;
  return `${start}—${end}`;
}
