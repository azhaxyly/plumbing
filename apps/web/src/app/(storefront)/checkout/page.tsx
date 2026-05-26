/**
 * Checkout page — /checkout/
 *
 * Server component: fetches cart totals, then renders the CheckoutForm
 * client component. Redirects to /cart/ if the cart is empty.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { computeTotals } from "@timsan/domain";
import { createServerTrpc } from "@/lib/trpc-server";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Оформление заявки — Timsan",
  description: "Оформите заявку на доставку товаров",
};

export default async function CheckoutPage() {
  const trpc = await createServerTrpc();
  const cart = await trpc.cart.get();

  // Redirect to cart if empty
  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  const totals = computeTotals(cart.items);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
        Оформление заявки
      </h1>
      <CheckoutForm
        subtotalTiyins={totals.subtotal.amount}
        itemCount={totals.itemCount}
      />
    </div>
  );
}
