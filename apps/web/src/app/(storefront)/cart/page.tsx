/**
 * Cart page — /cart/
 *
 * Server component: fetches cart data via tRPC server caller,
 * then renders the CartClient component for interactive updates.
 */

import type { Metadata } from "next";
import { createServerTrpc } from "@/lib/trpc-server";
import { CartClient } from "@/components/cart/cart-client";

export const metadata: Metadata = {
  title: "Корзина — Timsan",
  description: "Ваша корзина покупок",
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const trpc = await createServerTrpc();
  const cart = await trpc.cart.get();

  // Debug: log what we got
  console.log("[CartPage] cart:", JSON.stringify(cart, null, 2));

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
        Корзина
      </h1>
      <CartClient initialCart={cart} />
    </div>
  );
}
