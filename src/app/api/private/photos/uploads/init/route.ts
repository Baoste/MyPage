import { NextRequest, NextResponse } from "next/server";
import {
  authorizePhotoWrite,
  photoApiError,
  photoServiceError,
  readPhotoJson,
} from "@/app/api/private/photos/_shared";
import { validatePhotoUploadRequest } from "@/lib/photo/contracts";
import { initializePhotoUpload } from "@/services/photoService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;
  const body = await readPhotoJson(request);
  if (!body.ok) return body.response;
  const validation = validatePhotoUploadRequest(body.value);
  if (!validation.ok) return photoApiError(validation.message, 400);
  try {
    const intent = await initializePhotoUpload(validation.value);
    return NextResponse.json(
      { ok: true, ...intent },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoServiceError(error);
  }
}

