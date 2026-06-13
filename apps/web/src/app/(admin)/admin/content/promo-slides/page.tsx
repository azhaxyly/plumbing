import type { Metadata } from "next";

import { PromoSlidesClient } from "@/components/admin/content/promo-slides-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Афиши — Timsan Admin",
};

export default async function AdminPromoSlidesPage() {
  const trpc = await createServerTrpc();
  const slides = await trpc.adminPromoSlides.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Афиши</h1>
        <p className="mt-1 text-sm text-gray-500">
          Слайды баннера на главной странице (рекомендуемый размер: 850 × 550 px)
        </p>
      </div>

      <PromoSlidesClient initialSlides={slides} />
    </div>
  );
}
