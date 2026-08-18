import "server-only";

import { jwtVerify, SignJWT } from "jose";

const SESSION_ISSUER = "personal-site";
const SESSION_AUDIENCE = "private-space";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

export const privateSessionCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-yfxl99_session"
    : "yfxl99_session";

export interface PrivateSession {
  subject: "private-visitor";
  expiresAt: number;
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

export async function createPrivateSessionToken() {
  const secret = sessionSecret();
  if (!secret) throw new Error("Private session is not configured.");

  return new SignJWT({ access: "private" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("private-visitor")
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

    if (payload.sub !== "private-visitor" || !payload.exp) return null;
    return { subject: "private-visitor", expiresAt: payload.exp };
  } catch {
    return null;
  }
}
