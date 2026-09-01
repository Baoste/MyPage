import { NextRequest, NextResponse } from "next/server";
import { photoApiError, photoServiceError } from "@/app/api/private/photos/_shared";
import { getPrivateSession } from "@/lib/auth/session";
import { getPhotoPage } from "@/services/photoService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await getPrivateSession())) return photoApiError("请重新登录后再试。", 401);

  try {
    const page = await getPhotoPage(request.nextUrl.searchParams.get("cursor"));
    return NextResponse.json(
      { ok: true, ...page },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return photoServiceError(error);
  }
}
