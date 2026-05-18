/**
 * Revalidation helpers for on-demand ISR cache invalidation.
 * Called from admin mutations (Phase 5) after product/category/brand updates.
 *
 * Uses Next.js `revalidatePath` from `next/cache` — must be called from
 * Server Actions or Route Handlers only.
 */
import { revalidatePath } from "next/cache";

/**
 * Revalidates the ISR cache for a product page.
 * Call this after updating or deleting a product in the admin.
 */
export async function revalidateProduct(slug: string): Promise<void> {
  revalidatePath(`/product/${slug}`, "page");
}

/**
 * Revalidates the ISR cache for a category page and the category index.
 * Call this after updating or deleting a category in the admin.
 */
export async function revalidateCategory(slug: string): Promise<void> {
  revalidatePath(`/category/${slug}`, "page");
  revalidatePath("/category", "page");
}

/**
 * Revalidates the ISR cache for a brand page and the brands index.
 * Call this after updating or deleting a brand in the admin.
 */
export async function revalidateBrand(slug: string): Promise<void> {
  revalidatePath(`/brand/${slug}`, "page");
  revalidatePath("/brand", "page");
}
