import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession } from "@/app/api/private/calendar/_shared";
import { savePreview } from "@/services/calendarService";
export const dynamic = "force-dynamic";
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const session = await calendarSession(request, true); const { id } = await context.params; const bytes = await request.arrayBuffer(); await savePreview(session.userId, id, bytes, request.headers.get("content-type")?.split(";")[0] ?? ""); return new NextResponse(null, { status: 204 }); }
  catch (error) { return calendarServiceError(error); }
}
