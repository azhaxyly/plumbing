"use client";

/**
 * TrackRecentlyViewed — records the current product into the recently-viewed
 * localStorage list on mount. Renders nothing.
 */

import { useEffect } from "react";

import type { ProductCardData } from "@/components/catalog/product-card";
import { addRecentlyViewed } from "@/lib/recently-viewed";

interface TrackRecentlyViewedProps {
  product: ProductCardData;
}

export function TrackRecentlyViewed({ product }: TrackRecentlyViewedProps) {
  useEffect(() => {
    addRecentlyViewed(product);
    // Re-run when the viewed product changes (client-side navigation).
  }, [product]);

  return null;
}
