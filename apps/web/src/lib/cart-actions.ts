"use server";

/**
 * Server Actions for cart and wishlist operations.
 *
 * These are stubs — actual cart/wishlist logic will be implemented in Phase 3.
 * They log the intent and return a success response for now.
 */

export interface CartActionResult {
  success: boolean;
  error?: string;
}

/**
 * Adds a product variant to the cart.
 *
 * @param variantId - The ID of the product variant to add
 * @param quantity  - The quantity to add (must be >= 1)
 *
 * TODO (Phase 3): Implement real cart logic — guest cart in Redis,
 * authenticated cart in DB, inventory check.
 */
export async function addToCart(
  variantId: string,
  quantity: number
): Promise<void> {
  console.log("[addToCart] stub called", { variantId, quantity });
}

/**
 * Adds a product to the user's wishlist.
 *
 * @param productId - The ID of the product to add to wishlist
 *
 * TODO (Phase 3): Implement real wishlist logic — persist to DB for
 * authenticated users, store in localStorage/cookie for guests.
 */
export async function addToWishlist(productId: string): Promise<void> {
  console.log("[addToWishlist] stub called", { productId });
}
