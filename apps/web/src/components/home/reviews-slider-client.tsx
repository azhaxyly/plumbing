"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

import type { ReviewItem } from "@/lib/homepage-data";

interface ReviewsSliderClientProps {
  reviews: ReviewItem[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <Quote
        aria-hidden
        className="absolute right-5 top-5 h-8 w-8 text-accent/15"
        fill="currentColor"
      />

      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
          {getInitials(review.authorName)}
        </span>
        <div className="min-w-0">
          <div className="truncate font-semibold text-stone-900">
            {review.authorName}
          </div>
          <div className="mt-0.5 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={
                  star <= review.rating
                    ? "h-4 w-4 fill-amber-400 text-amber-400"
                    : "h-4 w-4 text-stone-300"
                }
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-stone-600">
        {review.text}
      </p>
    </div>
  );
}

export function ReviewsSliderClient({ reviews }: ReviewsSliderClientProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
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

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="group/slider relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-4 flex touch-pan-y">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {prevBtnEnabled && (
        <button
          onClick={scrollPrev}
          className="absolute -left-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-stone-600 shadow-md opacity-0 transition-all hover:bg-stone-50 hover:text-stone-900 focus:opacity-100 group-hover/slider:opacity-100 disabled:opacity-0"
          aria-label="Предыдущие отзывы"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {nextBtnEnabled && (
        <button
          onClick={scrollNext}
          className="absolute -right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-stone-600 shadow-md opacity-0 transition-all hover:bg-stone-50 hover:text-stone-900 focus:opacity-100 group-hover/slider:opacity-100 disabled:opacity-0"
          aria-label="Следующие отзывы"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
