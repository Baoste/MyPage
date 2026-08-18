import { NextRequest, NextResponse } from "next/server";
import { hasValidRequestOrigin } from "@/lib/auth/request";
import {
  privateSessionCookieName,
  privateSessionCookieOptions,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(privateSessionCookieName, "", {
    ...privateSessionCookieOptions,
    maxAge: 0,
  });
  return response;
}
