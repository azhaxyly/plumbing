import { SectionHeader } from "@/components/home/section-header";
import { ReviewsSliderClient } from "@/components/home/reviews-slider-client";
import type { ReviewItem } from "@/lib/homepage-data";

interface ReviewsSectionProps {
  reviews: ReviewItem[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Отзывы наших клиентов"
          subtitle="Что говорят покупатели о работе с Timsan"
        />
        <ReviewsSliderClient reviews={reviews} />
      </div>
    </section>
  );
}
