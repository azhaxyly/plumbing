import { getBestsellers } from "@/lib/homepage-data";
import { SectionHeader } from "./section-header";
import { ProductSliderClient } from "./product-slider-client";

export async function BestsellerSection() {
  const bestsellers = await getBestsellers(20);

  if (!bestsellers || bestsellers.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <SectionHeader title="Хиты продаж" href="/catalog?sort=popular" />
        <ProductSliderClient products={bestsellers} badge="Хит" />
      </div>
    </section>
  );
}
