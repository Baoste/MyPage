import { NextRequest, NextResponse } from "next/server";
import { PrivateAccountError, registerPrivateAccount } from "@/lib/auth/account";
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
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 4096) {
    return json("提交内容过大。", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json("Invalid request.", 400);
  }
  if (typeof body !== "object" || body === null) return json("Invalid request.", 400);
  const { username, password, invitationCode } = body as {
    username?: unknown;
    password?: unknown;
    invitationCode?: unknown;
  };
  if (
    typeof username !== "string"
    || username.length > 128
    || typeof password !== "string"
    || password.length > 256
    || typeof invitationCode !== "string"
    || invitationCode.length > 256
  ) return json("Invalid request.", 400);

  const clientKey = `register:${requestClientKey(request)}`;
  const rateLimit = consumeLoginAttempt(clientKey);
  if (!rateLimit.allowed) {
    const response = json("尝试次数过多，请稍后再试。", 429);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }
  if (!isSessionConfigured()) return json("账号服务暂时不可用。", 503);

  let account;
  try {
    account = await registerPrivateAccount(username, password, invitationCode);
  } catch (error) {
    if (error instanceof PrivateAccountError) return json(error.message, error.status);
    return json("暂时无法创建账号。", 503);
  }

  clearLoginAttempts(clientKey);
  const token = await createPrivateSessionToken(account);
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(privateSessionCookieName, token, privateSessionCookieOptions);
  return response;
}
