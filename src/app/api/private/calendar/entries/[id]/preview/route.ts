import { NextRequest, NextResponse } from "next/server";
import { calendarServiceError, calendarSession } from "@/app/api/private/calendar/_shared";
import { savePreview } from "@/services/calendarService";
export const dynamic = "force-dynamic";
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { await calendarSession(request, true); const { id } = await context.params; const bytes = await request.arrayBuffer(); const role = request.nextUrl.searchParams.get("variant") === "thumbnail" ? "thumbnail" : "preview"; await savePreview(id, bytes, request.headers.get("content-type")?.split(";")[0] ?? "", role); return new NextResponse(null, { status: 204 }); }
  catch (error) { return calendarServiceError(error); }
}
