import type { ProductCardData } from "@/components/catalog/product-card";

import { ProductSliderClient } from "./product-slider-client";
import { SectionHeader } from "./section-header";

interface BestsellerSectionProps {
  products: ProductCardData[];
}

export function BestsellerSection({ products }: BestsellerSectionProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <SectionHeader title="Хиты продаж" href="/catalog?sort=popular" />
        <ProductSliderClient products={products} badge="Хит" />
      </div>
    </section>
  );
}
