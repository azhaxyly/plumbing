/**
 * Recently-viewed products — persisted in localStorage (client only).
 *
 * Stores ready-to-render ProductCardData so the home page slider can show them
 * without a round-trip. Capped, deduped by id, most-recent first.
 */

import type { ProductCardData } from "@/components/catalog/product-card";

const STORAGE_KEY = "timsan:recentlyViewed";
const MAX_ITEMS = 12;

/** Reads the recently-viewed list. Returns [] on SSR or any parse error. */
export function getRecentlyViewed(): ProductCardData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductCardData[]) : [];
  } catch {
    return [];
  }
}

/** Prepends a product (deduped by id), trims to MAX_ITEMS, persists. */
export function addRecentlyViewed(product: ProductCardData): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentlyViewed().filter((p) => p.id !== product.id);
    const next = [product, ...current].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota/serialization errors are non-fatal — skip persisting.
  }
}
