import type { ProductCardData } from "@/components/catalog/product-card";
import { SectionHeader } from "./section-header";
import { ProductSliderClient } from "./product-slider-client";

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
    <section className="bg-red-700 py-14">
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Распродажа"
          subtitle={`Скидки до ${maxDiscount}%`}
          href="/catalog?sale=true"
          light
        />
        <ProductSliderClient products={products} />
      </div>
    </section>
  );
}
