import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { readEditableImage } from "@/app/api/private/editable-image";
import {
  authorizeFoodWrite,
  foodApiError,
  foodServiceError,
} from "@/app/api/private/food/_shared";
import { addFoodImage } from "@/services/foodService";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authorizationError = await authorizeFoodWrite(request);
  if (authorizationError) return authorizationError;
  const upload = await readEditableImage(request);
  if (!upload.ok) return foodApiError(upload.message, 400);
  const { id } = await context.params;
  try {
    const image = await addFoodImage(id, upload.value);
    revalidatePath("/yfxl99/food");
    return NextResponse.json(
      { ok: true, image },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
