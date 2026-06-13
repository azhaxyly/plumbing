import type { Metadata } from "next";

import { ReviewsClient } from "@/components/admin/content/reviews-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Отзывы — Timsan Admin",
};

export default async function AdminReviewsPage() {
  const trpc = await createServerTrpc();
  const reviews = await trpc.adminReviews.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Отзывы</h1>
        <p className="mt-1 text-sm text-gray-500">
          Отзывы клиентов в слайдере на главной странице
        </p>
      </div>

      <ReviewsClient initialReviews={reviews} />
    </div>
  );
}
