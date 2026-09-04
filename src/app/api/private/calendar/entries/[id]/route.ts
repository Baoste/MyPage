import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession } from "@/app/api/private/calendar/_shared";
import { deleteEntry, saveEntry } from "@/services/calendarService";
export const dynamic = "force-dynamic";
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const session = await calendarSession(request, true); const { id } = await context.params; const body = await request.json() as { finalText?: unknown; layout?: unknown; updatedAt?: unknown }; return NextResponse.json({ entry: await saveEntry(session.userId, id, body.finalText, body.layout, body.updatedAt) }); }
  catch (error) { return calendarServiceError(error); }
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const session = await calendarSession(request, true); const { id } = await context.params; await deleteEntry(session.userId, id); return new NextResponse(null, { status: 204 }); }
  catch (error) { return calendarServiceError(error); }
}
