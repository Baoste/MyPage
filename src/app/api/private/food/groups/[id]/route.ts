import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  authorizeFoodWrite,
  foodServiceError,
  readFoodJson,
} from "@/app/api/private/food/_shared";
import { validateFoodGroupUpdateRequest } from "@/lib/food/contracts";
import { deleteFoodGroup, updateFoodGroup } from "@/services/foodService";

export const dynamic = "force-dynamic";

type FoodGroupRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: FoodGroupRouteContext) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;

  const body = await readFoodJson(request);
  if (!body.ok) return body.response;
  const validation = validateFoodGroupUpdateRequest(body.value);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: validation.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id } = await context.params;
  try {
    const result = await updateFoodGroup(id, validation.value);
    revalidatePath("/yfxl99/food");
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}

export async function DELETE(request: NextRequest, context: FoodGroupRouteContext) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;

  const { id } = await context.params;
  try {
    await deleteFoodGroup(id);
    revalidatePath("/yfxl99/food");
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
