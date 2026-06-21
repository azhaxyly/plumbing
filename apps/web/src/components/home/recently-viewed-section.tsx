"use client";

/**
 * RecentlyViewedSection — home page slider of products the user recently opened.
 * Reads localStorage after mount (renders nothing on SSR / when empty).
 */

import { useEffect, useState } from "react";

import type { ProductCardData } from "@/components/catalog/product-card";
import { getRecentlyViewed } from "@/lib/recently-viewed";

import { ProductSliderClient } from "./product-slider-client";
import { SectionHeader } from "./section-header";

export function RecentlyViewedSection() {
  const [products, setProducts] = useState<ProductCardData[] | null>(null);

  useEffect(() => {
    setProducts(getRecentlyViewed());
  }, []);

  // Not mounted yet, or nothing to show.
  if (!products || products.length === 0) return null;

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <SectionHeader title="Недавно вы смотрели" />
        <ProductSliderClient products={products} />
      </div>
    </section>
  );
}
