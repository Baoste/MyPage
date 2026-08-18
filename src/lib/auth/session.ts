import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  privateSessionCookieName,
  sessionMaxAgeSeconds,
  verifyPrivateSessionToken,
} from "@/lib/auth/token";

export {
  createPrivateSessionToken,
  isSessionConfigured,
  privateSessionCookieName,
} from "@/lib/auth/token";
export type { PrivateSession } from "@/lib/auth/token";

export async function getPrivateSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(privateSessionCookieName)?.value;
  return token ? verifyPrivateSessionToken(token) : null;
}

export async function requirePrivateSession() {
  const session = await getPrivateSession();
  if (!session) redirect("/yfxl99");
  return session;
}

export const privateSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: sessionMaxAgeSeconds,
};
