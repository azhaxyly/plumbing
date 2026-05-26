import type { ProductCardData } from "@/components/catalog/product-card";
import { SectionHeader } from "./section-header";
import { ProductSliderClient } from "./product-slider-client";

interface NewArrivalsSectionProps {
  products: ProductCardData[];
}

export function NewArrivalsSection({ products }: NewArrivalsSectionProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 bg-stone-50">
      <div className="container mx-auto px-4">
        <SectionHeader title="Новинки" href="/catalog?sort=newest" />
        <ProductSliderClient products={products} badge="Новинка" />
      </div>
    </section>
  );
}
