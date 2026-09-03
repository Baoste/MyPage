import "server-only";

import bcrypt from "bcryptjs";

const WINDOW_MILLISECONDS = 15 * 60 * 1_000;
const MAXIMUM_ATTEMPTS = 5;
const MAXIMUM_PASSWORD_BYTES = 72;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/;

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  articlePublishAttempts?: Map<string, AttemptRecord>;
};

const attempts = globalStore.articlePublishAttempts ?? new Map<string, AttemptRecord>();
globalStore.articlePublishAttempts = attempts;

function configuredPasswordHash() {
  return process.env.ARTICLE_PUBLISH_PASSWORD_HASH?.trim() ?? "";
}

export function isArticlePublishConfigured() {
  return BCRYPT_HASH_PATTERN.test(configuredPasswordHash());
}

export async function verifyArticlePublishPassword(candidate: string) {
  const configuredHash = configuredPasswordHash();
  if (
    !BCRYPT_HASH_PATTERN.test(configuredHash)
    || new TextEncoder().encode(candidate).byteLength > MAXIMUM_PASSWORD_BYTES
  ) {
    return false;
  }

  try {
    return await bcrypt.compare(candidate, configuredHash);
  } catch {
    return false;
  }
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
