import { NextRequest, NextResponse } from "next/server";
import { getPrivateSession } from "@/lib/auth/session";
import { foodApiError, foodServiceError } from "@/app/api/private/food/_shared";
import { refreshFoodImageUrl } from "@/services/foodService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getPrivateSession())) return foodApiError("请重新登录后再试。", 401);
  const { id } = await context.params;
  try {
    const imageUrl = await refreshFoodImageUrl(id);
    return NextResponse.json(
      { ok: true, imageUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return foodServiceError(error);
  }
}
