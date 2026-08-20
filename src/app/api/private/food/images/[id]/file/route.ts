import { NextRequest, NextResponse } from "next/server";
import { foodApiError, foodServiceError } from "@/app/api/private/food/_shared";
import { getPrivateSession } from "@/lib/auth/session";
import { readFoodImageFile } from "@/services/foodService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getPrivateSession())) return foodApiError("请重新登录后再试。", 401);
  const { id } = await context.params;
  const variant = request.nextUrl.searchParams.get("variant") === "thumbnail"
    ? "thumbnail"
    : "original";
  try {
    const image = await readFoodImageFile(id, variant);
    const etag = `"food-${id}-${variant}"`;
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
    return foodServiceError(error);
  }
}
