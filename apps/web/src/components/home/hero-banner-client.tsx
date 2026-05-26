"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@timsan/ui";

import type { BannerWithProducts } from "@/lib/homepage-data";
import { BannerProductCard } from "./banner-product-card";

interface HeroBannerClientProps {
  banners: BannerWithProducts[];
}

export function HeroBannerClient({ banners }: HeroBannerClientProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true }),
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onInit = useCallback((emblaApi: any) => {
    setScrollSnaps(emblaApi.scrollSnapList());
  }, []);

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on("reInit", onInit).on("reInit", onSelect).on("select", onSelect);
  }, [emblaApi, onInit, onSelect]);

  if (!banners || banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden bg-stone-100" ref={emblaRef}>
      <div className="flex touch-pan-y">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="relative min-w-0 flex-[0_0_100%]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 h-full">
              {/* Левая колонка (PromoBlock) */}
              <div className="relative flex min-h-[300px] flex-col justify-center p-8 md:min-h-[400px]">
                {/* Background Image */}
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  priority={index === 0}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-start gap-4 text-white">
                  <h2 className="text-3xl font-bold md:text-5xl">{banner.title}</h2>
                  {banner.linkUrl && (
                    <Button asChild variant="default" size="lg" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Link href={banner.linkUrl as Route}>Подробнее</Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Правая колонка: карточки товаров */}
              <div className="flex items-center bg-stone-50 p-6">
                <div className="flex w-full gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 lg:grid-cols-4">
                  {banner.products.map((bp) => bp.product).slice(0, 4).map((product) => (
                    <BannerProductCard
                      key={product.id}
                      id={product.id}
                      slug={product.slug}
                      name={product.name}
                      priceCents={product.priceCents}
                      compareAtPriceCents={product.compareAtPriceCents}
                      primaryImageUrl={product.images?.[0]?.url ?? null}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-stone-800 shadow-md transition-colors hover:bg-white md:left-8"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-stone-800 shadow-md transition-colors hover:bg-white md:right-8"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  index === selectedIndex
                    ? "w-8 bg-emerald-600"
                    : "bg-white/60 hover:bg-white"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
