import "server-only";

import bcrypt from "bcryptjs";

const bcryptHashPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function configuredPasswordHash() {
  return process.env.PRIVATE_SITE_PASSWORD_HASH?.trim() ?? "";
}

export function isPasswordConfigured() {
  return bcryptHashPattern.test(configuredPasswordHash());
}

export async function verifyPrivatePassword(password: string) {
  const hash = configuredPasswordHash();
  if (!bcryptHashPattern.test(hash)) {
    throw new Error("Private password is not configured.");
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
