import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  authorizePhotoWrite,
  photoServiceError,
  readPhotoJson,
} from "@/app/api/private/photos/_shared";
import { validatePhotoUpdateRequest } from "@/lib/photo/contracts";
import { deletePhoto, updatePhoto } from "@/services/photoService";

export const dynamic = "force-dynamic";
type PhotoRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: PhotoRouteContext) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const body = await readPhotoJson(request);
  if (!body.ok) return body.response;
  const validation = validatePhotoUpdateRequest(body.value);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: validation.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { id } = await context.params;
  try {
    const result = await updatePhoto(id, validation.value);
    revalidatePath("/yfxl99/photos");
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoServiceError(error);
  }
}

export async function DELETE(request: NextRequest, context: PhotoRouteContext) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const { id } = await context.params;
  try {
    await deletePhoto(id);
    revalidatePath("/yfxl99/photos");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return photoServiceError(error);
  }
}

