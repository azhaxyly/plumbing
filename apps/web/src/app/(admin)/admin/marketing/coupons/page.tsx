/**
 * Admin coupons page — Server Component.
 * See task 25.7.
 */
import type { Metadata } from "next";

import { CouponsClient } from "@/components/admin/marketing/coupons-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Купоны — Timsan Admin",
};

export default async function AdminCouponsPage() {
  const trpc = await createServerTrpc();
  const coupons = await trpc.adminCoupons.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Купоны</h1>
        <p className="mt-1 text-sm text-gray-500">
          Промокоды и скидочные купоны для покупателей
        </p>
      </div>

      <CouponsClient initialCoupons={coupons} />
    </div>
  );
}
