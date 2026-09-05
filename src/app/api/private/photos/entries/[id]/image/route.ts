import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { readEditableImage } from "@/app/api/private/editable-image";
import { authorizePhotoWrite, photoApiError, photoServiceError } from "@/app/api/private/photos/_shared";
import { replacePhotoImage } from "@/services/photoService";

export const dynamic = "force-dynamic";

/** Compatibility endpoint for the former one-image Photos editor. */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const upload = await readEditableImage(request);
  if (!upload.ok) return photoApiError(upload.message, 400);
  const { id } = await context.params;
  try {
    const image = await replacePhotoImage(id, id, upload.value);
    revalidatePath("/yfxl99/photos");
    return NextResponse.json({ ok: true, image }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return photoServiceError(error);
  }
}
