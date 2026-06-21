import type { ProductCardData } from "@/components/catalog/product-card";

import { ProductSliderClient } from "./product-slider-client";
import { SectionHeader } from "./section-header";

interface RelatedProductsSectionProps {
  products: ProductCardData[];
  title?: string;
}

export function RelatedProductsSection({
  products,
  title = "Рекомендуем вам",
}: RelatedProductsSectionProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12" aria-label={title}>
      <SectionHeader title={title} />
      <ProductSliderClient products={products} />
    </section>
  );
}
