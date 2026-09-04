import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession } from "@/app/api/private/calendar/_shared";
import { readCalendarAsset } from "@/services/calendarService";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const session = await calendarSession(request); const { id } = await context.params; const asset = await readCalendarAsset(session.userId, id); return new NextResponse(asset.bytes, { headers: { "Cache-Control": "private, max-age=300", "Content-Type": asset.mimeType, "Content-Length": String(asset.byteSize), "X-Content-Type-Options": "nosniff" } }); }
  catch (error) { return calendarServiceError(error); }
}
