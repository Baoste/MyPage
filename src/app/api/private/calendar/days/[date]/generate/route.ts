import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession, enforceCalendarRateLimit } from "@/app/api/private/calendar/_shared";
import { generateEntry } from "@/services/calendarService";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: NextRequest, context: { params: Promise<{ date: string }> }) {
  try {
    const session = await calendarSession(request, true); enforceCalendarRateLimit(request, session.userId);
    if (Number(request.headers.get("content-length") ?? 0) > 32_000) return NextResponse.json({ error: "请求内容过大。" }, { status: 413 });
    const body = await request.json() as { sourceIds?: string[]; userNote?: string }; const { date } = await context.params;
    return NextResponse.json({ entry: await generateEntry(session.userId, date, body.sourceIds ?? [], body.userNote ?? "") });
  } catch (error) { return calendarServiceError(error); }
}
