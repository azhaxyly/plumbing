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

export async function createBannerAction(input: {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  backgroundColor?: string;
  posterPosition?: "left" | "right" | "none";
  maxProducts?: number;
  position: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const banner = await trpc.adminBanners.create({
      ...input,
      linkUrl: input.linkUrl?.trim() || undefined,
    });
    return { data: { id: banner.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updateBannerAction(input: {
  id: string;
  title?: string;
  imageUrl?: string;
  linkUrl?: string | null;
  backgroundColor?: string;
  posterPosition?: "left" | "right" | "none";
  maxProducts?: number;
  position?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBanners.update({
      ...input,
      linkUrl: input.linkUrl?.trim() || null,
    });
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deleteBannerAction(input: { id: string }): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBanners.delete(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function addBannerProductAction(input: {
  bannerId: string;
  productId: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBanners.addProduct(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function removeBannerProductAction(input: {
  bannerId: string;
  productId: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBanners.removeProduct(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function reorderBannerProductsAction(input: {
  bannerId: string;
  productIds: string[];
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBanners.reorderProducts(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function searchProductsForBannerAction(input: {
  q: string;
}): Promise<ActionResult<{ id: string; name: string; priceCents: number; slug: string; images: { url: string }[] }[]>> {
  try {
    const trpc = await createServerTrpc();
    const products = await trpc.adminBanners.searchProducts(input);
    return { data: products };
  } catch (err) {
    return { error: extractError(err) };
  }
}
