import { NextRequest, NextResponse } from "next/server";
import {
  authorizePhotoWrite,
  photoApiError,
  photoServiceError,
  readPhotoJson,
} from "@/app/api/private/photos/_shared";
import { createPhotoComment, getPhotoComments } from "@/services/photoService";

export const dynamic = "force-dynamic";

type PhotoCommentRouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: PhotoCommentRouteContext,
) {
  const { id } = await context.params;
  try {
    const comments = await getPhotoComments(id);
    return NextResponse.json(
      { ok: true, comments },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoServiceError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: PhotoCommentRouteContext,
) {
  const authorizationError = await authorizePhotoWrite(request);
  if (authorizationError) return authorizationError;

  const body = await readPhotoJson(request);
  if (!body.ok) return body.response;
  if (typeof body.value !== "object" || body.value === null || !("content" in body.value)) {
    return photoApiError("请输入评论内容。", 400);
  }

  const { id } = await context.params;
  try {
    const comment = await createPhotoComment(
      id,
      (body.value as { content?: unknown }).content,
    );
    return NextResponse.json(
      { ok: true, comment },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoServiceError(error);
  }
}
