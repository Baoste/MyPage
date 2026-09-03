import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

const WINDOW_MILLISECONDS = 15 * 60 * 1_000;
const MAXIMUM_ATTEMPTS = 5;

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  articlePublishAttempts?: Map<string, AttemptRecord>;
};

const attempts = globalStore.articlePublishAttempts ?? new Map<string, AttemptRecord>();
globalStore.articlePublishAttempts = attempts;

function passwordDigest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isArticlePublishConfigured() {
  return Boolean(process.env.ARTICLE_PUBLISH_PASSWORD?.trim());
}

export function verifyArticlePublishPassword(candidate: string) {
  const configured = process.env.ARTICLE_PUBLISH_PASSWORD ?? "";
  return timingSafeEqual(passwordDigest(candidate), passwordDigest(configured));
}

export function consumeArticlePublishAttempt(key: string) {
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

export function clearArticlePublishAttempts(key: string) {
  attempts.delete(key);
}
