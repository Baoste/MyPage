export const TREE_EPOCH_MILLISECONDS = Date.parse("2020-09-26T00:00:00+08:00");

const SECOND_MILLISECONDS = 1_000;
const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 60 * MINUTE_SECONDS;
const DAY_SECONDS = 24 * HOUR_SECONDS;

export interface TreeElapsedTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function calculateTreeElapsedTime(nowMilliseconds: number): TreeElapsedTime {
  const totalSeconds = Math.max(
    0,
    Math.floor((nowMilliseconds - TREE_EPOCH_MILLISECONDS) / SECOND_MILLISECONDS),
  );

  return {
    days: Math.floor(totalSeconds / DAY_SECONDS),
    hours: Math.floor((totalSeconds % DAY_SECONDS) / HOUR_SECONDS),
    minutes: Math.floor((totalSeconds % HOUR_SECONDS) / MINUTE_SECONDS),
    seconds: totalSeconds % MINUTE_SECONDS,
  };
}
