import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { readEditableImage } from "@/app/api/private/editable-image";
import {
  authorizeFoodWrite,
  foodApiError,
  foodServiceError,
} from "@/app/api/private/food/_shared";
import { deleteFoodImage, replaceFoodImage } from "@/services/foodService";

export const dynamic = "force-dynamic";
type ImageRouteContext = { params: Promise<{ id: string; imageId: string }> };

export async function PUT(request: NextRequest, context: ImageRouteContext) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;
  const upload = await readEditableImage(request);
  if (!upload.ok) return foodApiError(upload.message, 400);
  const { id, imageId } = await context.params;
  try {
    const image = await replaceFoodImage(id, imageId, upload.value);
    revalidatePath("/yfxl99/food");
    return NextResponse.json(
      { ok: true, image },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}

export async function DELETE(request: NextRequest, context: ImageRouteContext) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;
  const { id, imageId } = await context.params;
  try {
    await deleteFoodImage(id, imageId);
    revalidatePath("/yfxl99/food");
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
