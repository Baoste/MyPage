import { NextRequest, NextResponse } from "next/server";
import { getPrivateSession } from "@/lib/auth/session";
import { hasValidRequestOrigin, requestClientKey } from "@/lib/auth/request";
import { consumeFoodWriteAttempt } from "@/lib/food/upload-rate-limit";
import { FoodServiceError } from "@/services/foodService";

const MAXIMUM_FOOD_JSON_BYTES = 64 * 1024;

export function foodApiError(message: string, status: number, retryAfterSeconds?: number) {
  const response = NextResponse.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  if (retryAfterSeconds) response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function authorizeFoodWrite(request: NextRequest) {
  if (!request.headers.get("origin") || !hasValidRequestOrigin(request)) {
    return foodApiError("请求已被拒绝。", 403);
  }
  if (!(await getPrivateSession())) return foodApiError("请重新登录后再试。", 401);
  const attempt = consumeFoodWriteAttempt(requestClientKey(request));
  return attempt.allowed
    ? null
    : foodApiError("操作过于频繁，请稍后再试。", 429, attempt.retryAfterSeconds);
}

export async function readFoodJson(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_FOOD_JSON_BYTES) {
    return { ok: false as const, response: foodApiError("提交内容过大。", 413) };
  }

  try {
    const reader = request.body?.getReader();
    if (!reader) return { ok: false as const, response: foodApiError("提交内容格式不正确。", 400) };
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAXIMUM_FOOD_JSON_BYTES) {
        await reader.cancel();
        return { ok: false as const, response: foodApiError("提交内容过大。", 413) };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      ok: true as const,
      value: JSON.parse(new TextDecoder().decode(bytes)) as unknown,
    };
  } catch {
    return { ok: false as const, response: foodApiError("提交内容格式不正确。", 400) };
  }
}

export function foodServiceError(error: unknown) {
  if (error instanceof FoodServiceError) return foodApiError(error.message, error.status);
  console.error("Unexpected private food API error.", error);
  return foodApiError("美食记录暂时无法处理，请稍后再试。", 500);
}

export function readIdentifiers(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const groupId = "groupId" in value ? (value as { groupId?: unknown }).groupId : undefined;
  const requestId = "requestId" in value ? (value as { requestId?: unknown }).requestId : undefined;
  return typeof groupId === "string" && typeof requestId === "string"
    ? { groupId, requestId }
    : null;
}
