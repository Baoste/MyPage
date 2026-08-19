import { NextRequest, NextResponse } from "next/server";
import { photoApiError, photoServiceError } from "@/app/api/private/photos/_shared";
import { getPrivateSession } from "@/lib/auth/session";
import { refreshPhotoImageUrl } from "@/services/photoService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getPrivateSession())) return photoApiError("请重新登录后再试。", 401);
  const { id } = await context.params;
  try {
    const imageUrl = await refreshPhotoImageUrl(id);
    return NextResponse.json(
      { ok: true, imageUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoServiceError(error);
  }
}

