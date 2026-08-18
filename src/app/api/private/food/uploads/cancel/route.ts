import { NextRequest, NextResponse } from "next/server";
import {
  authorizeFoodWrite,
  foodApiError,
  foodServiceError,
  readFoodJson,
  readIdentifiers,
} from "@/app/api/private/food/_shared";
import { cancelFoodUpload } from "@/services/foodService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;

  const body = await readFoodJson(request);
  if (!body.ok) return body.response;
  const identifiers = readIdentifiers(body.value);
  if (!identifiers) return foodApiError("上传标识不完整。", 400);

  try {
    await cancelFoodUpload(identifiers.groupId, identifiers.requestId);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
