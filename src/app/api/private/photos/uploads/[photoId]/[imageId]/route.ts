import { NextRequest, NextResponse } from "next/server";
import {
  authorizePhotoWrite,
  photoApiError,
  photoServiceError,
  readPhotoImageBytes,
} from "@/app/api/private/photos/_shared";
import { uploadPhotoImage } from "@/services/photoService";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ photoId: string; imageId: string }> },
) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const requestId = request.nextUrl.searchParams.get("requestId");
  const variant = request.nextUrl.searchParams.get("variant") === "thumbnail" ? "thumbnail" : "original";
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!requestId || !contentType) return photoApiError("上传标识或图片格式不完整。", 400);
  const body = await readPhotoImageBytes(request);
  if (!body.ok) return body.response;
  const { photoId, imageId } = await context.params;
  try {
    await uploadPhotoImage(photoId, imageId, requestId, body.bytes, contentType, variant);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return photoServiceError(error);
  }
}
