/**
 * Checkout success page — /checkout/success?orderId=...
 *
 * Shown after a successful order submission.
 * Displays the order ID and links to continue shopping.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { CheckCircle } from "lucide-react";
import { Button } from "@timsan/ui";

export const metadata: Metadata = {
  title: "Заявка оформлена — Timsan",
  description: "Ваша заявка успешно оформлена",
  robots: { index: false, follow: true },
};

interface CheckoutSuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { orderId } = await searchParams;

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center md:px-6">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle
          className="h-10 w-10 text-green-600"
          aria-hidden="true"
        />
      </div>

      <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
        Заявка оформлена!
      </h1>

      {orderId && (
        <p className="mb-2 text-gray-600">
          Номер вашей заявки:{" "}
          <span className="font-semibold text-gray-900">{orderId}</span>
        </p>
      )}

      <p className="mb-8 max-w-md text-gray-500">
        Мы свяжемся с вами в ближайшее время для подтверждения заказа и
        уточнения деталей доставки.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        {orderId && (
          <Button asChild>
            <Link href={`/orders/${orderId}` as Route}>Посмотреть заказ</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={"/orders" as Route}>Все мои заказы</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={"/" as Route}>На главную</Link>
        </Button>
      </div>
    </div>
  );
}
