import { getNewArrivals } from "@/lib/homepage-data";
import { SectionHeader } from "./section-header";
import { ProductSliderClient } from "./product-slider-client";

export async function NewArrivalsSection() {
  const newArrivals = await getNewArrivals(20);

  if (!newArrivals || newArrivals.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 bg-stone-50">
      <div className="container mx-auto px-4">
        <SectionHeader title="Новинки" href="/catalog?sort=newest" />
        <ProductSliderClient products={newArrivals} badge="Новинка" />
      </div>
    </section>
  );
}
