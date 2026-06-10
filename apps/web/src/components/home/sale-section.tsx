import { ProductSliderClient } from "./product-slider-client";
import { SectionHeader } from "./section-header";

import type { ProductCardData } from "@/components/catalog/product-card";

interface SaleSectionProps {
  products: ProductCardData[];
}

export function SaleSection({ products }: SaleSectionProps) {
  if (!products || products.length === 0) {
    return null;
  }

  const maxDiscount = Math.max(
    ...products.map((p) => {
      if (!p.compareAtPriceCents) return 0;
      return Math.round((1 - p.priceCents / p.compareAtPriceCents) * 100);
    })
  );

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="rounded-2xl bg-[#F75E25] px-6 py-8 md:px-8 md:py-10">
          <SectionHeader
            title="Распродажа"
            subtitle={`Скидки до ${maxDiscount}%`}
            href="/catalog?sale=true"
            light
          />
          <ProductSliderClient products={products} />
        </div>
      </div>
    </section>
  );
}
