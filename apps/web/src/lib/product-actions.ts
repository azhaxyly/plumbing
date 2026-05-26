/**
 * Server Actions for admin product management.
 *
 * These actions are called from the ProductForm component.
 * They delegate to the tRPC router via the server-side caller.
 *
 * See task 25.3.
 */
"use server";

import { TRPCError } from "@trpc/server";

import { createServerTrpc } from "@/lib/trpc-server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  data?: T;
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

// ─── Product Actions ──────────────────────────────────────────────────────────

export async function createProductAction(input: {
  name: string;
  slug: string;
  sku: string;
  brandId: string;
  status: "active" | "draft" | "archived";
  priceCents: number;
  compareAtPriceCents?: number | null;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const trpc = await createServerTrpc();
    const product = await trpc.adminProducts.create(input);
    return { data: { id: product.id, slug: product.slug } };
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function updateProductAction(input: {
  id: string;
  name?: string;
  slug?: string;
  sku?: string;
  brandId?: string;
  status?: "active" | "draft" | "archived";
  priceCents?: number;
  compareAtPriceCents?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
}): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const trpc = await createServerTrpc();
    const product = await trpc.adminProducts.update(input);
    return { data: { id: product.id, slug: product.slug } };
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function deleteProductAction(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminProducts.delete(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

// ─── Variant Actions ──────────────────────────────────────────────────────────

export async function upsertVariantAction(input: {
  productId: string;
  id?: string;
  sku: string;
  priceCents: number;
  quantity: number;
  attributes?: Record<string, string>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const variant = await trpc.adminProducts.upsertVariant({
      ...input,
      attributes: input.attributes ?? {},
    });
    return { data: { id: variant.id } };
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function deleteVariantAction(input: {
  variantId: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminProducts.deleteVariant(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

// ─── Image Actions ────────────────────────────────────────────────────────────

export async function upsertImageAction(input: {
  productId: string;
  id?: string;
  url: string;
  alt?: string;
  position?: number;
  isPrimary?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const image = await trpc.adminProducts.upsertImage({
      productId: input.productId,
      id: input.id,
      url: input.url,
      alt: input.alt ?? "",
      position: input.position ?? 0,
      isPrimary: input.isPrimary ?? false,
    });
    return { data: { id: image.id } };
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function deleteImageAction(input: {
  imageId: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminProducts.deleteImage(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

// ─── Category / Attribute Actions ─────────────────────────────────────────────

export async function setCategoriesAction(input: {
  productId: string;
  categoryIds: string[];
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminProducts.setCategories(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function setAttributesAction(input: {
  productId: string;
  attributes: { attributeId: string; attributeValueId: string }[];
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminProducts.setAttributes(input);
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}
