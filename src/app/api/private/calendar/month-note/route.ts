import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession } from "@/app/api/private/calendar/_shared";
import { saveCalendarMonthNote } from "@/services/calendarService";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const session = await calendarSession(request, true);
    if (Number(request.headers.get("content-length") ?? 0) > 16_000) return NextResponse.json({ error: "Notes 内容过大。" }, { status: 413 });
    const body = await request.json() as { month?: unknown; content?: unknown };
    return NextResponse.json(await saveCalendarMonthNote(session.userId, body.month as string, body.content));
  } catch (error) {
    return calendarServiceError(error);
  }
}
