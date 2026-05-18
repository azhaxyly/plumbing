/**
 * Auth.js middleware — protects /account/* and /admin/* routes.
 * next-intl is configured without middleware (using getTranslations directly).
 */
import type { NextMiddleware } from "next/server";
import { NextResponse } from "next/server";
import NextAuth, { type NextAuthResult } from "next-auth";

import { authConfig } from "./auth.config";

const authResult: NextAuthResult = NextAuth(authConfig);

const middleware: NextMiddleware = authResult.auth(function (req) {
  const { pathname } = req.nextUrl;

  // RBAC: /admin/* requires admin or manager role
  if (pathname.startsWith("/admin")) {
    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    if (role !== "admin" && role !== "manager") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

export default middleware;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
