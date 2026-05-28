"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const onInit = useCallback((api: typeof emblaApi) => {
    setScrollSnaps(api!.scrollSnapList());
  }, []);

  const onSelect = useCallback((api: typeof emblaApi) => {
    setSelectedIndex(api!.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on("reInit", onInit).on("reInit", onSelect).on("select", onSelect);
  }, [emblaApi, onInit, onSelect]);

  if (!banners || banners.length === 0) return null;

  const activePosterPosition = (banners[selectedIndex]?.posterPosition as "left" | "right" | "none") ?? "left";

  const dotsPositionClass =
    activePosterPosition === "right"
      ? "absolute bottom-3 right-[19%] z-20 flex gap-1.5"
      : activePosterPosition === "none"
      ? "absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
      : "absolute bottom-3 left-[19%] z-20 flex -translate-x-1/2 gap-1.5";

  return (
    <div className="relative overflow-hidden rounded-2xl" ref={emblaRef}>
      <div className="flex touch-pan-y">
        {banners.map((banner, slideIndex) => {
          const posterPosition = (banner.posterPosition as "left" | "right" | "none") ?? "left";
          const maxProducts = banner.maxProducts ?? 4;
          const hasPoster = posterPosition !== "none";

          const products = banner.products
            .slice()
            .sort((a, b) => a.position - b.position)
            .slice(0, maxProducts)
            .map((bp) => bp.product);

          const posterEl = hasPoster ? (
            banner.linkUrl ? (
              <Link
                href={banner.linkUrl as Route}
                className="relative flex-[0_0_38%] overflow-hidden rounded-xl"
              >
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  priority={slideIndex === 0}
                  className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                  sizes="(max-width: 768px) 40vw, 38vw"
                />
              </Link>
            ) : (
              <div className="relative flex-[0_0_38%] overflow-hidden rounded-xl">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  priority={slideIndex === 0}
                  className="object-cover"
                  sizes="(max-width: 768px) 40vw, 38vw"
                />
              </div>
            )
          ) : null;

          const gridClass = (() => {
            const n = products.length;
            if (hasPoster) {
              if (n === 1) return "grid-cols-1";
              if (n === 2) return "grid-cols-2";
              if (n === 3) return "grid-cols-3";
              if (n === 4) return "grid-cols-2 md:grid-cols-4";
              if (n === 5) return "grid-cols-3 md:grid-cols-5";
              return "grid-cols-3 md:grid-cols-6";
            }
            if (n === 1) return "grid-cols-1";
            if (n === 2) return "grid-cols-2";
            if (n === 3) return "grid-cols-3";
            if (n <= 4) return "grid-cols-2 md:grid-cols-4";
            if (n === 5) return "grid-cols-3 md:grid-cols-5";
            return "grid-cols-3 md:grid-cols-6";
          })();

          const productsEl = products.length > 0 ? (
            <div className={`flex-1 grid h-full gap-2 md:gap-3 ${gridClass}`}>
              {products.map((product) => (
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
          ) : null;

          return (
            <div key={banner.id} className="min-w-0 flex-[0_0_100%]">
              <div
                className="flex h-[280px] items-stretch gap-2 p-2 md:h-[340px] md:gap-3 md:p-3"
                style={{ backgroundColor: banner.backgroundColor ?? "#f5f5f4" }}
              >
                {posterPosition === "right" ? (
                  <>{productsEl}{posterEl}</>
                ) : (
                  <>{posterEl}{productsEl}</>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow transition hover:bg-white"
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow transition hover:bg-white"
            aria-label="Следующий слайд"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots — positioned relative to active banner's poster side */}
          <div className={dotsPositionClass}>
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === selectedIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Слайд ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
