"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { ProductCard, type ProductCardData } from "@/components/catalog/product-card";

interface ProductSliderClientProps {
  products: ProductCardData[];
  badge?: "Хит" | "Новинка" | null | undefined;
}

export function ProductSliderClient({ products, badge }: ProductSliderClientProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    // Mobile: snap to whole slides (no partial peek). Tablet/desktop keep
    // the free-scroll feel.
    dragFree: false,
    breakpoints: {
      "(min-width: 640px)": { dragFree: true },
    },
  });

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (!products || products.length === 0) return null;

  return (
    <div className="group/slider relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-4 flex touch-pan-y">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-0 flex-[0_0_50%] pl-4 sm:flex-[0_0_44%] lg:flex-[0_0_22%]"
            >
              <ProductCard product={product} badge={badge} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {prevBtnEnabled && (
        <button
          onClick={scrollPrev}
          className="absolute -left-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-stone-600 opacity-0 shadow-md transition-all hover:bg-stone-50 hover:text-stone-900 focus:opacity-100 disabled:opacity-0 group-hover/slider:opacity-100"
          aria-label="Previous items"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {nextBtnEnabled && (
        <button
          onClick={scrollNext}
          className="absolute -right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-stone-600 opacity-0 shadow-md transition-all hover:bg-stone-50 hover:text-stone-900 focus:opacity-100 disabled:opacity-0 group-hover/slider:opacity-100"
          aria-label="Next items"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
