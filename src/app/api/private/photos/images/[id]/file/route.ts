import { NextRequest, NextResponse } from "next/server";
import { photoApiError, photoServiceError } from "@/app/api/private/photos/_shared";
import { getPrivateSession } from "@/lib/auth/session";
import { readPhotoImageFile } from "@/services/photoService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getPrivateSession())) return photoApiError("请重新登录后再试。", 401);
  const { id } = await context.params;
  const variant = request.nextUrl.searchParams.get("variant") === "thumbnail"
    ? "thumbnail"
    : "original";
  try {
    const image = await readPhotoImageFile(id, variant);
    const etag = `"photo-${id}-${variant}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { "Cache-Control": "private, max-age=300", ETag: etag },
      });
    }
    return new NextResponse(image.bytes, {
      headers: {
        "Cache-Control": "private, max-age=300, no-transform",
        "Content-Length": String(image.bytes.byteLength),
        "Content-Type": image.mimeType,
        "Content-Disposition": "inline",
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return photoServiceError(error);
  }
}
