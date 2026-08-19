import { NextRequest, NextResponse } from "next/server";
import { getPrivateSession } from "@/lib/auth/session";
import { hasValidRequestOrigin, requestClientKey } from "@/lib/auth/request";
import { consumeFoodWriteAttempt } from "@/lib/food/upload-rate-limit";
import { PHOTO_UPLOAD_LIMITS } from "@/lib/photo/contracts";
import { PhotoServiceError } from "@/services/photoService";

const MAXIMUM_PHOTO_JSON_BYTES = 64 * 1024;

export function photoApiError(message: string, status: number, retryAfterSeconds?: number) {
  const response = NextResponse.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  if (retryAfterSeconds) response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function authorizePhotoWrite(request: NextRequest) {
  if (!request.headers.get("origin") || !hasValidRequestOrigin(request)) {
    return photoApiError("请求已被拒绝。", 403);
  }
  if (!(await getPrivateSession())) return photoApiError("请重新登录后再试。", 401);
  const attempt = consumeFoodWriteAttempt(`photos:${requestClientKey(request)}`);
  return attempt.allowed
    ? null
    : photoApiError("操作过于频繁，请稍后再试。", 429, attempt.retryAfterSeconds);
}

export async function readPhotoJson(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_PHOTO_JSON_BYTES) {
    return { ok: false as const, response: photoApiError("提交内容过大。", 413) };
  }
  try {
    const reader = request.body?.getReader();
    if (!reader) {
      return { ok: false as const, response: photoApiError("提交内容格式不正确。", 400) };
    }
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAXIMUM_PHOTO_JSON_BYTES) {
        await reader.cancel();
        return { ok: false as const, response: photoApiError("提交内容过大。", 413) };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true as const, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false as const, response: photoApiError("提交内容格式不正确。", 400) };
  }
}

export async function readPhotoImageBytes(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength)
    && declaredLength > PHOTO_UPLOAD_LIMITS.maximumImageBytes
  ) return { ok: false as const, response: photoApiError("单张图片不能超过 10MB。", 413) };

  const reader = request.body?.getReader();
  if (!reader) return { ok: false as const, response: photoApiError("没有收到图片内容。", 400) };
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > PHOTO_UPLOAD_LIMITS.maximumImageBytes) {
        await reader.cancel();
        return { ok: false as const, response: photoApiError("单张图片不能超过 10MB。", 413) };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false as const, response: photoApiError("读取上传图片失败。", 400) };
  }
  if (totalBytes === 0) {
    return { ok: false as const, response: photoApiError("没有收到图片内容。", 400) };
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true as const, bytes };
}

export function photoServiceError(error: unknown) {
  if (error instanceof PhotoServiceError) return photoApiError(error.message, error.status);
  console.error("Unexpected private Photos API error.", error);
  return photoApiError("照片记录暂时无法处理，请稍后再试。", 500);
}

export function readPhotoIdentifiers(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const photoId = "photoId" in value ? (value as { photoId?: unknown }).photoId : undefined;
  const requestId = "requestId" in value ? (value as { requestId?: unknown }).requestId : undefined;
  return typeof photoId === "string" && typeof requestId === "string"
    ? { photoId, requestId }
    : null;
}

