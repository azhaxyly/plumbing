import { getSaleProducts } from "@/lib/homepage-data";
import { SectionHeader } from "./section-header";
import { ProductSliderClient } from "./product-slider-client";

export async function SaleSection() {
  const saleProducts = await getSaleProducts(20);

  if (!saleProducts || saleProducts.length === 0) {
    return null;
  }

  const maxDiscount = Math.max(
    ...saleProducts.map((p) => {
      if (!p.compareAtPriceCents) return 0;
      return Math.round((1 - p.priceCents / p.compareAtPriceCents) * 100);
    })
  );

  return (
    <section className="bg-stone-900 py-14">
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Распродажа"
          subtitle={`До ${maxDiscount}% скидки`}
          href="/catalog?sale=true"
          light
        />
        <ProductSliderClient products={saleProducts} />
      </div>
    </section>
  );
}
