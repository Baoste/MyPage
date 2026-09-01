import { NextRequest, NextResponse } from "next/server";
import {
  authorizeFoodWrite,
  foodApiError,
  foodServiceError,
  readFoodJson,
} from "@/app/api/private/food/_shared";
import { createFoodComment, getFoodComments } from "@/services/foodService";

export const dynamic = "force-dynamic";

type FoodCommentRouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: FoodCommentRouteContext,
) {
  const { id } = await context.params;
  try {
    const comments = await getFoodComments(id);
    return NextResponse.json(
      { ok: true, comments },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: FoodCommentRouteContext,
) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;

  const body = await readFoodJson(request);
  if (!body.ok) return body.response;
  if (typeof body.value !== "object" || body.value === null || !("content" in body.value)) {
    return foodApiError("请输入评论内容。", 400);
  }

  const { id } = await context.params;
  try {
    const comment = await createFoodComment(
      id,
      (body.value as { content?: unknown }).content,
    );
    return NextResponse.json(
      { ok: true, comment },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
