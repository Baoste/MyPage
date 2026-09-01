import "server-only";

import { jwtVerify, SignJWT } from "jose";

const SESSION_ISSUER = "personal-site";
const SESSION_AUDIENCE = "private-space";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

export const privateSessionCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-yfxl99_session"
    : "yfxl99_session";

export interface PrivateSession {
  userId: string;
  username: string;
  expiresAt: number;
}

interface SessionAccount {
  id: string;
  username: string;
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32
    ? new TextEncoder().encode(secret)
    : null;
}

export function isSessionConfigured() {
  return sessionSecret() !== null;
}

export async function createPrivateSessionToken(account: SessionAccount) {
  const secret = sessionSecret();
  if (!secret) throw new Error("Private session is not configured.");

  return new SignJWT({ access: "private", username: account.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(account.id)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAgeSeconds}s`)
    .sign(secret);
}

export async function verifyPrivateSessionToken(
  token: string,
): Promise<PrivateSession | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (
      payload.access !== "private"
      || !payload.sub
      || !UUID_PATTERN.test(payload.sub)
      || typeof payload.username !== "string"
      || Array.from(payload.username).length < 2
      || Array.from(payload.username).length > 32
      || !payload.exp
    ) return null;
    return { userId: payload.sub, username: payload.username, expiresAt: payload.exp };
  } catch {
    return null;
  }
}
