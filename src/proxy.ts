import { NextRequest, NextResponse } from "next/server";
import {
  privateSessionCookieName,
  verifyPrivateSessionToken,
} from "@/lib/auth/token";

const publicPrivateApiRoutes = new Set([
  "/api/private/login",
  "/api/private/register",
  "/api/private/logout",
]);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/yfxl99" || publicPrivateApiRoutes.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(privateSessionCookieName)?.value;
  const session = token ? await verifyPrivateSessionToken(token) : null;
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/private/")) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/yfxl99";
  loginUrl.search = "";
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(privateSessionCookieName);
  return response;
}

export const config = {
  matcher: ["/yfxl99/:path*", "/api/private/:path*"],
};
