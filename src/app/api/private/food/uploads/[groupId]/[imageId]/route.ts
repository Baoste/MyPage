import { NextRequest, NextResponse } from "next/server";
import {
  authorizeFoodWrite,
  foodApiError,
  foodServiceError,
  readFoodImageBytes,
} from "@/app/api/private/food/_shared";
import { uploadFoodImage } from "@/services/foodService";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ groupId: string; imageId: string }> },
) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;

  const requestId = request.nextUrl.searchParams.get("requestId");
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!requestId || !contentType) return foodApiError("上传标识或图片格式不完整。", 400);

  const body = await readFoodImageBytes(request);
  if (!body.ok) return body.response;
  const { groupId, imageId } = await context.params;

  try {
    await uploadFoodImage(groupId, imageId, requestId, body.bytes, contentType);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
