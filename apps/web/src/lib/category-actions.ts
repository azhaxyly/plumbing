/**
 * Server Actions for admin category management.
 *
 * These actions are called from the CategoryTreeClient component.
 * They delegate to the tRPC router via the server-side caller.
 *
 * See task 25.1.
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

export async function createCategoryAction(input: {
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string | null;
  position?: number;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminCategories.create(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function updateCategoryAction(input: {
  id: string;
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  position?: number;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminCategories.update(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function deleteCategoryAction(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminCategories.delete(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function reorderCategoriesAction(
  items: { id: string; position: number }[],
): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminCategories.reorder({ items });
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}
