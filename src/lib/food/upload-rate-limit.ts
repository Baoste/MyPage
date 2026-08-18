interface AttemptWindow {
  count: number;
  resetAt: number;
}

const WINDOW_MILLISECONDS = 10 * 60 * 1_000;
const MAXIMUM_ATTEMPTS = 60;
const attempts = new Map<string, AttemptWindow>();

export function consumeFoodWriteAttempt(key: string) {
  const now = Date.now();
  if (attempts.size > 500) {
    for (const [entryKey, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(entryKey);
    }
  }

  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MILLISECONDS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAXIMUM_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
