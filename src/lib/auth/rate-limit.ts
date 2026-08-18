import "server-only";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const globalRateLimit = globalThis as typeof globalThis & {
  privateLoginAttempts?: Map<string, AttemptRecord>;
};

const attempts =
  globalRateLimit.privateLoginAttempts ?? new Map<string, AttemptRecord>();
globalRateLimit.privateLoginAttempts = attempts;

export function consumeLoginAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
