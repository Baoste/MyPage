import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession } from "@/app/api/private/calendar/_shared";
import { getCalendarDay } from "@/services/calendarService";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ date: string }> }) {
  try { await calendarSession(request); const { date } = await context.params; return NextResponse.json(await getCalendarDay(date)); }
  catch (error) { return calendarServiceError(error); }
}
