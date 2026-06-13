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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF7A3D] via-[#F75E25] to-[#D8410F] px-6 py-8 shadow-[0_20px_60px_-25px_rgba(216,65,15,0.7)] md:px-8 md:py-10">

          {/* Decorative layers — purely visual, behind content */}
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            {/* Warm glow top-right */}
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#FFD27A] opacity-30 blur-3xl" />
            {/* Deep glow bottom-left */}
            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#C4360B] opacity-40 blur-3xl" />
            {/* Dotted texture */}
            <div
              className="absolute inset-0 opacity-[0.10]"
              style={{
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            {/* Repeating lightning-bolt motif */}
            <div
              className="absolute -inset-10 rotate-[-12deg] opacity-[0.09]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M34 14 18 52h12l-6 26 24-40H34l8-24z' fill='%23ffffff'/%3E%3Cpath d='M94 60 78 98h12l-6 26 24-40H94l8-24z' fill='%23ffffff'/%3E%3C/svg%3E\")",
                backgroundSize: "120px 120px",
              }}
            />
            {/* Diagonal shine sweep */}
            <div className="absolute -inset-x-10 -top-1/2 h-[200%] rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="relative z-10">
            <SectionHeader
              title="Распродажа"
              subtitle={`Скидки до ${maxDiscount}%`}
              href="/catalog?sale=true"
              light
            />
            <ProductSliderClient products={products} />
          </div>
        </div>
      </div>
    </section>
  );
}
