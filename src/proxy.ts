import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Lightweight, edge-safe gate: only checks whether a session cookie is
 * present. The authoritative check (cookie validity, expiry, active user,
 * role) happens server-side in each page/layout and API route handler,
 * since that requires a database lookup that can't run on the edge runtime
 * against a local libSQL file.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
