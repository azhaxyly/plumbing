"use server";

import { TRPCError } from "@trpc/server";
import { createServerTrpc } from "@/lib/trpc-server";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

function extractError(err: unknown): string {
  if (err instanceof TRPCError) return err.message;
  if (err instanceof Error) return err.message;
  return "Неизвестная ошибка";
}

export async function addBestsellerProductAction(
  productId: string,
): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBestsellers.addProduct({ productId });
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function removeBestsellerProductAction(
  productId: string,
): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBestsellers.removeProduct({ productId });
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function reorderBestsellerProductsAction(
  productIds: string[],
): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBestsellers.reorderProducts({ productIds });
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function searchProductsForBestsellerAction(
  q: string,
): Promise<ActionResult<{ id: string; name: string; priceCents: number; slug: string; images: { url: string }[] }[]>> {
  try {
    const trpc = await createServerTrpc();
    const data = await trpc.adminBestsellers.searchProducts({ q });
    return { data };
  } catch (err) {
    return { error: extractError(err) };
  }
}
