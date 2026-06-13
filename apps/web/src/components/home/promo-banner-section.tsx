"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, CreditCard, PhoneCall, Truck } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import type { PromoSlide } from "@/lib/homepage-data";

// ─── Static info tiles ────────────────────────────────────────────────────────

const infoTiles = [
  {
    icon: Truck,
    title: "Доставка по Казахстану",
    description: "Быстрая и бережная доставка в любой город. Уточним детали после оформления заказа.",
    href: "/",
    bg: "#2B7BC8",
    textColor: "text-white",
    descColor: "text-blue-100",
    iconBg: "bg-white/20",
  },
  {
    icon: CreditCard,
    title: "Рассрочка и Kaspi Red",
    description: "Покупайте сантехнику в рассрочку через Kaspi — без переплат и без лишних документов.",
    href: "/",
    bg: "#F14635",
    textColor: "text-white",
    descColor: "text-red-100",
    iconBg: "bg-white/20",
  },
  {
    icon: PhoneCall,
    title: "Консультация",
    description: "Колл-центр работает ежедневно с 09:00 до 22:00. Поможем с подбором и ответим на вопросы.",
    href: "tel:+77762016466",
    bg: "#F75E25",
    textColor: "text-white",
    descColor: "text-orange-100",
    iconBg: "bg-white/20",
  },
];

// ─── Banner slider ────────────────────────────────────────────────────────────

function BannerSlider({ slides }: { slides: PromoSlide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (slides.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">800 × 600 — место для афиши</span>
      </div>
    );
  }

  const multiSlide = slides.length > 1;

  return (
    <div className="group/banner relative h-full overflow-hidden" ref={emblaRef}>
      <div className="flex h-full touch-pan-y">
        {slides.map((slide) => {
          const inner = (
            <div className="relative h-full w-full">
              <Image
                src={slide.imageUrl}
                alt={slide.title}
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover"
                priority
              />
            </div>
          );
          return (
            <div
              key={slide.id}
              className="relative min-w-0 flex-[0_0_100%]"
            >
              {slide.linkUrl ? (
                <Link href={slide.linkUrl as Route} className="block h-full">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>

      {/* Arrows — only when multiple slides */}
      {multiSlide && canScrollPrev && (
        <button
          onClick={scrollPrev}
          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-md opacity-0 transition-all hover:bg-white group-hover/banner:opacity-100"
          aria-label="Предыдущий слайд"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {multiSlide && canScrollNext && (
        <button
          onClick={scrollNext}
          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-md opacity-0 transition-all hover:bg-white group-hover/banner:opacity-100"
          aria-label="Следующий слайд"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Dots */}
      {multiSlide && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Слайд ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === selectedIndex ? "w-5 bg-white" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface PromoBannerSectionProps {
  slides: PromoSlide[];
}

export function PromoBannerSection({ slides }: PromoBannerSectionProps) {
  return (
    <section className="mt-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr] xl:items-stretch">

          {/* Left: swipeable poster slider */}
          <div className="relative aspect-[850/500] rounded-xl overflow-hidden bg-[#DCDCDC]">
            <BannerSlider slides={slides} />
          </div>

          {/* Right: info tiles — стопкой на телефоне, в ряд по 3 на планшете, столбцом на десктопе */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1 xl:grid-rows-3">
            {infoTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div
                  key={tile.title}
                  className="rounded-xl flex flex-col justify-between p-5"
                  style={{ backgroundColor: tile.bg }}
                >
                  <div className={`self-start rounded-lg p-2 ${tile.iconBg}`}>
                    <Icon className={`h-6 w-6 ${tile.textColor}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-base leading-snug mb-1 ${tile.textColor}`}>
                      {tile.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${tile.descColor}`}>
                      {tile.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
