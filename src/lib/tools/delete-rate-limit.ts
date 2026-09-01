import "server-only";

const WINDOW_MILLISECONDS = 15 * 60 * 1_000;
const MAXIMUM_ATTEMPTS = 5;

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  toolDeleteAttempts?: Map<string, AttemptRecord>;
};

const attempts = globalStore.toolDeleteAttempts ?? new Map<string, AttemptRecord>();
globalStore.toolDeleteAttempts = attempts;

export function consumeToolDeleteAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MILLISECONDS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= MAXIMUM_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1_000),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearToolDeleteAttempts(key: string) {
  attempts.delete(key);
}
