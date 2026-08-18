import { NextRequest, NextResponse } from "next/server";
import { isPasswordConfigured, verifyPrivatePassword } from "@/lib/auth/password";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/auth/rate-limit";
import { hasValidRequestOrigin, requestClientKey } from "@/lib/auth/request";
import {
  createPrivateSessionToken,
  isSessionConfigured,
  privateSessionCookieName,
  privateSessionCookieOptions,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function json(message: string, status: number) {
  return NextResponse.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return json("Request rejected.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json("Invalid request.", 400);
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;

  if (typeof password !== "string" || password.length === 0 || password.length > 256) {
    return json("Invalid request.", 400);
  }

  const clientKey = requestClientKey(request);
  const rateLimit = consumeLoginAttempt(clientKey);
  if (!rateLimit.allowed) {
    const response = json("Too many attempts. Please try again later.", 429);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  if (!isPasswordConfigured() || !isSessionConfigured()) {
    return json("Private space is unavailable right now.", 503);
  }

  if (!(await verifyPrivatePassword(password))) {
    return json("Incorrect password.", 401);
  }

  clearLoginAttempts(clientKey);
  const token = await createPrivateSessionToken();
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(privateSessionCookieName, token, privateSessionCookieOptions);
  return response;
}
