import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { readEditableImage } from "@/app/api/private/editable-image";
import { authorizePhotoWrite, photoApiError, photoServiceError } from "@/app/api/private/photos/_shared";
import { deletePhotoImage, replacePhotoImage } from "@/services/photoService";

export const dynamic = "force-dynamic";
type ImageRouteContext = { params: Promise<{ id: string; imageId: string }> };

export async function PUT(request: NextRequest, context: ImageRouteContext) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const upload = await readEditableImage(request);
  if (!upload.ok) return photoApiError(upload.message, 400);
  const { id, imageId } = await context.params;
  try {
    const image = await replacePhotoImage(id, imageId, upload.value);
    revalidatePath("/yfxl99/photos");
    return NextResponse.json({ ok: true, image }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return photoServiceError(error);
  }
}

export async function DELETE(request: NextRequest, context: ImageRouteContext) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const { id, imageId } = await context.params;
  try {
    await deletePhotoImage(id, imageId);
    revalidatePath("/yfxl99/photos");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return photoServiceError(error);
  }
}
