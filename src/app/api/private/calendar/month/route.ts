import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession } from "@/app/api/private/calendar/_shared";
import { getCalendarMonth } from "@/services/calendarService";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { const session = await calendarSession(request); const days = await getCalendarMonth(session.userId, request.nextUrl.searchParams.get("month") ?? ""); return NextResponse.json({ days }); }
  catch (error) { return calendarServiceError(error); }
}
