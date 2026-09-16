import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge fast-path for protected routes.
 *
 * IMPORTANT: this is a UX optimisation, NOT authorization. It only checks for
 * the presence of a session cookie so unauthenticated visitors skip a server
 * render. Every protected page re-verifies the session against the database in
 * server code (`requireUser` / `requireWorkspaceContext`); a forged or stale
 * cookie gains nothing.
 */
const SESSION_COOKIE = "better-auth.session_token";

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(`${SESSION_COOKIE}.secure`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace/:path*"],
};
