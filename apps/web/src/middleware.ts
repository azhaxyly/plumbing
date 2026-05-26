/**
 * Auth.js middleware — protects /account/* and /admin/* routes.
 * next-intl is configured without middleware (using getTranslations directly).
 *
 * Flow for /admin/* routes:
 *  1. Auth.js `authorized` callback (in auth.config.ts) redirects unauthenticated
 *     users to /login?callbackUrl=/admin before this middleware body runs.
 *  2. This middleware body performs RBAC: only `admin` and `manager` roles are
 *     allowed. Any other authenticated role is redirected to / with ?error=forbidden.
 */
import type { NextMiddleware } from "next/server";
import { NextResponse } from "next/server";
import NextAuth, { type NextAuthResult } from "next-auth";

import { authConfig } from "./auth.config";

const ADMIN_ALLOWED_ROLES = new Set(["admin", "manager"]);

const authResult: NextAuthResult = NextAuth(authConfig);

const middleware: NextMiddleware = authResult.auth(function (req) {
  const { pathname } = req.nextUrl;

  // RBAC: /admin/* requires admin or manager role.
  // At this point the user is guaranteed to be authenticated because the
  // `authorized` callback in auth.config.ts already redirected unauthenticated
  // requests to /login.
  if (pathname.startsWith("/admin")) {
    const role = (req.auth?.user as { role?: string } | undefined)?.role;

    if (!role || !ADMIN_ALLOWED_ROLES.has(role)) {
      // Authenticated but insufficient role — redirect to home with error hint.
      const homeUrl = new URL("/", req.url);
      homeUrl.searchParams.set("error", "forbidden");
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

export default middleware;

export const config = {
  matcher: [
    // Run middleware on all routes except static assets and API routes.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    // Explicitly include /admin/* to make the intent clear.
    "/admin/:path*",
  ],
};
