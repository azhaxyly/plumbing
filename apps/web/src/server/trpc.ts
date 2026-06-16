/**
 * tRPC server initialization.
 *
 * Defines the base tRPC instance, context, and procedure builders.
 * See: https://trpc.io/docs/server/routers
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";

import { auth } from "@/auth";

// ─── Context ──────────────────────────────────────────────────────────────────

export interface TRPCContext {
  req: NextRequest;
  /** Authenticated user id, or null for guests. */
  userId: string | null;
  /** User role, or null for guests. */
  userRole: string | null;
}

/**
 * Creates the tRPC context from a Next.js request.
 * Called once per request.
 */
export async function createTRPCContext(req: NextRequest): Promise<TRPCContext> {
  const session = await auth();
  const user = session?.user as
    | { id?: string; role?: string }
    | undefined;

  return {
    req,
    userId: user?.id ?? null,
    userRole: user?.role ?? null,
  };
}

// ─── tRPC instance ────────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Protected procedure — requires an authenticated user.
 * Throws UNAUTHORIZED if the user is not logged in.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      userRole: ctx.userRole,
    },
  });
});
