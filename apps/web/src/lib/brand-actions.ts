/**
 * Server Actions for admin brand management.
 *
 * These actions are called from the BrandsClient component.
 * They delegate to the tRPC router via the server-side caller.
 *
 * See task 25.2.
 */
"use server";

import { TRPCError } from "@trpc/server";

import { createServerTrpc } from "@/lib/trpc-server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionResult {
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  if (err instanceof TRPCError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Неизвестная ошибка";
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createBrandAction(input: {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBrands.create(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function updateBrandAction(input: {
  id: string;
  name?: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBrands.update(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function deleteBrandAction(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBrands.delete(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function updateBrandGridAction(
  items: { id: string; showInGrid: boolean; gridOrder: number }[],
): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBrands.updateGrid(items);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}
