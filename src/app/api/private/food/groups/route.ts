import { NextRequest, NextResponse } from "next/server";
import { foodApiError, foodServiceError } from "@/app/api/private/food/_shared";
import { getPrivateSession } from "@/lib/auth/session";
import { getFoodGroupPage } from "@/services/foodService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await getPrivateSession())) return foodApiError("请重新登录后再试。", 401);

  try {
    const page = await getFoodGroupPage(request.nextUrl.searchParams.get("cursor"));
    return NextResponse.json(
      { ok: true, ...page },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
