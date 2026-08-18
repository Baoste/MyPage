import { NextRequest, NextResponse } from "next/server";
import { authorizeFoodWrite, foodApiError, foodServiceError, readFoodJson } from "@/app/api/private/food/_shared";
import { validateFoodUploadRequest } from "@/lib/food/contracts";
import { initializeFoodUpload } from "@/services/foodService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;

  const body = await readFoodJson(request);
  if (!body.ok) return body.response;
  const validation = validateFoodUploadRequest(body.value);
  if (!validation.ok) return foodApiError(validation.message, 400);

  try {
    const intent = await initializeFoodUpload(validation.value);
    return NextResponse.json(
      { ok: true, ...intent },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
