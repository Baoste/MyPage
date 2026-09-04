import { NextRequest, NextResponse } from "next/server";
import { getPrivateSession } from "@/lib/auth/session";
import { hasValidRequestOrigin, requestClientKey } from "@/lib/auth/request";
import { CalendarServiceError } from "@/services/calendarService";

const attempts = new Map<string, number[]>();

export function calendarError(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
export async function calendarSession(request: NextRequest, write = false) {
  const session = await getPrivateSession();
  if (!session) throw new CalendarServiceError("请重新登录后再试。", 401);
  if (write && !hasValidRequestOrigin(request)) throw new CalendarServiceError("请求来源无效。", 403);
  return session;
}
export function enforceCalendarRateLimit(request: NextRequest, userId: string) {
  const key = `${userId}:${requestClientKey(request)}`, now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 3) throw new CalendarServiceError("生成太频繁，请稍后再试。", 429);
  recent.push(now); attempts.set(key, recent);
}
export function calendarServiceError(error: unknown) {
  if (error instanceof CalendarServiceError) return calendarError(error.message, error.status);
  if (error instanceof Error && /布局|画布|Cover|贴纸|文字/u.test(error.message)) return calendarError(error.message, 400);
  return calendarError("Calendar 暂时无法完成请求。", 500);
}
