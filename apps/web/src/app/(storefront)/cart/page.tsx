/**
 * Cart page — /cart/
 *
 * Server component: fetches cart data via tRPC server caller,
 * then renders the CartClient component for interactive updates.
 */

import { prisma } from "@timsan/db";
import type { Metadata } from "next";

import { CartClient } from "@/components/cart/cart-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Ваша корзина покупок",
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const trpc = await createServerTrpc();
  const cart = await trpc.cart.get();

  // Resolve product slugs so cart rows can link to the product page.
  // Cart items store productId but not slug — look them up here (no DB migration).
  const productIds = [...new Set((cart?.items ?? []).map((item) => item.productId))];
  const slugMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, slug: true },
    });
    for (const p of products) {
      slugMap[p.id] = p.slug;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">Корзина</h1>
      <CartClient initialCart={cart} slugMap={slugMap} />
    </div>
  );
}
