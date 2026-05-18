/**
 * RBAC utilities for protecting route handlers and server actions.
 * Usage:
 *   export const GET = withRole(["admin", "manager"])(async (req) => { ... });
 */
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";

export type UserRole = "customer" | "manager" | "admin";

type RouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<NextResponse | Response>;

/**
 * Wraps a Next.js Route Handler with role-based access control.
 * Returns 401 if not authenticated, 403 if role is not allowed.
 *
 * @example
 * export const GET = withRole(["admin", "manager"])(async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withRole(allowedRoles: UserRole[]) {
  return function (handler: RouteHandler): RouteHandler {
    return async function (req, context) {
      const session = await auth();

      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      }

      const userRole = ((session.user as { role?: string }).role ??
        "customer") as UserRole;

      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        );
      }

      return handler(req, context);
    };
  };
}

/**
 * Checks if the current session has one of the allowed roles.
 * Useful in Server Actions and Server Components.
 *
 * @throws {Error} if not authenticated or role is not allowed
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<void> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userRole = ((session.user as { role?: string }).role ??
    "customer") as UserRole;

  if (!allowedRoles.includes(userRole)) {
    throw new Error("Forbidden");
  }
}

/**
 * Returns the current user's role, or null if not authenticated.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const session = await auth();
  if (!session?.user) return null;
  return ((session.user as { role?: string }).role ?? "customer") as UserRole;
}
