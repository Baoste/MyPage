import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  authorizePhotoWrite,
  photoApiError,
  photoServiceError,
  readPhotoIdentifiers,
  readPhotoJson,
} from "@/app/api/private/photos/_shared";
import { completePhotoUpload } from "@/services/photoService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const body = await readPhotoJson(request);
  if (!body.ok) return body.response;
  const identifiers = readPhotoIdentifiers(body.value);
  if (!identifiers) return photoApiError("上传标识不完整。", 400);
  try {
    const result = await completePhotoUpload(identifiers.photoId, identifiers.requestId);
    revalidatePath("/yfxl99/photos");
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoServiceError(error);
  }
}

