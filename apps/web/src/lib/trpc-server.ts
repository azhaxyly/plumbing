/**
 * tRPC server-side caller for use in Server Components and Server Actions.
 *
 * Usage in a Server Component:
 *   import { createServerTrpc } from "@/lib/trpc-server";
 *   const trpc = await createServerTrpc();
 *   const cart = await trpc.cart.get();
 */

import "server-only";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { cache } from "react";

import { appRouter } from "@/server/root";
import { createCallerFactory, createTRPCContext } from "@/server/trpc";

const createCaller = createCallerFactory(appRouter);

/**
 * Creates a tRPC caller for server-side use.
 * Cached per request via React's `cache()`.
 */
export const createServerTrpc = cache(async () => {
  const headersList = await headers();
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("host") ?? "localhost";
  const req = new Request(`${proto}://${host}/api/trpc`) as unknown as NextRequest;

  const ctx = await createTRPCContext(req);
  return createCaller(ctx);
});
