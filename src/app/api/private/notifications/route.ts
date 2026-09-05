import { NextRequest, NextResponse } from "next/server";
import { getPrivateSession } from "@/lib/auth/session";
import { hasValidRequestOrigin } from "@/lib/auth/request";
import { getPrivateNotifications, markPrivateNotificationsRead } from "@/services/notificationService";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const session = await getPrivateSession();
  if (!session) return errorResponse("请重新登录后再试。", 401);
  try {
    return NextResponse.json(
      { ok: true, ...await getPrivateNotifications(session.userId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to load private notifications.", error);
    return errorResponse("暂时无法读取通知。", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!request.headers.get("origin") || !hasValidRequestOrigin(request)) {
    return errorResponse("请求已被拒绝。", 403);
  }
  const session = await getPrivateSession();
  if (!session) return errorResponse("请重新登录后再试。", 401);
  try {
    await markPrivateNotificationsRead(session.userId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to mark private notifications as read.", error);
    return errorResponse("暂时无法更新通知。", 500);
  }
}
