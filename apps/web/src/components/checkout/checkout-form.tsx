"use client";

/**
 * CheckoutForm — client component for the checkout page.
 * Uses React's useActionState (React 19) to handle Server Action state.
 */

import { useActionState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@timsan/ui";
import type { CheckoutActionState } from "@/lib/checkout-actions";
import { submitCheckout } from "@/lib/checkout-actions";

// ─── Field error helper ───────────────────────────────────────────────────────

function FieldError({ errors }: { errors?: string[] | undefined }) {
  if (!errors || errors.length === 0) return null;
  return (
    <p className="mt-1 text-xs text-red-500" role="alert">
      {errors[0]}
    </p>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckoutFormProps {
  subtotalTiyins: number;
  itemCount: number;
}

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatPrice(tiyins: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(tiyins / 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

const initialState: CheckoutActionState = { success: false };

export function CheckoutForm({ subtotalTiyins, itemCount }: CheckoutFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitCheckout,
    initialState,
  );

  return (
    <form action={formAction} noValidate>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Left: form fields ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact info */}
          <section aria-labelledby="contact-heading">
            <h2
              id="contact-heading"
              className="mb-4 text-lg font-semibold text-gray-900"
            >
              Контактные данные
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Имя <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="given-name"
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  aria-describedby={
                    state.errors?.name ? "name-error" : undefined
                  }
                />
                <FieldError errors={state.errors?.name} />
              </div>

              {/* Phone */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="phone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Телефон{" "}
                  <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+7XXXXXXXXXX"
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  aria-describedby={
                    state.errors?.phone ? "phone-error" : undefined
                  }
                />
                <FieldError errors={state.errors?.phone} />
              </div>
            </div>
          </section>

          {/* Delivery address */}
          <section aria-labelledby="address-heading">
            <h2
              id="address-heading"
              className="mb-4 text-lg font-semibold text-gray-900"
            >
              Адрес доставки по Алматы
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              {/* Street */}
              <div className="sm:col-span-4">
                <label
                  htmlFor="street"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Улица{" "}
                  <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  autoComplete="address-line1"
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  aria-describedby={
                    state.errors?.street ? "street-error" : undefined
                  }
                />
                <FieldError errors={state.errors?.street} />
              </div>

              {/* Building */}
              <div className="sm:col-span-1">
                <label
                  htmlFor="building"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Дом{" "}
                  <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="building"
                  name="building"
                  type="text"
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  aria-describedby={
                    state.errors?.building ? "building-error" : undefined
                  }
                />
                <FieldError errors={state.errors?.building} />
              </div>

              {/* Apartment */}
              <div className="sm:col-span-1">
                <label
                  htmlFor="apartment"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Квартира
                </label>
                <input
                  id="apartment"
                  name="apartment"
                  type="text"
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </div>
            </div>
          </section>

          {/* Comment */}
          <section aria-labelledby="comment-heading">
            <h2
              id="comment-heading"
              className="mb-4 text-lg font-semibold text-gray-900"
            >
              Дополнительно
            </h2>

            <div>
              <label
                htmlFor="comment"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Комментарий к заказу
              </label>
              <textarea
                id="comment"
                name="comment"
                rows={3}
                disabled={isPending}
                placeholder="Уточнения по доставке, удобное время и т.д."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 resize-none"
              />
            </div>
          </section>

          {/* Payment method (cash on delivery — only option) */}
          <section aria-labelledby="payment-heading">
            <h2
              id="payment-heading"
              className="mb-4 text-lg font-semibold text-gray-900"
            >
              Способ оплаты
            </h2>
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">
                Оплата при получении
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Курьер доставит заказ и примет оплату наличными
              </p>
            </div>
          </section>

          {/* Consent */}
          <div className="flex items-start gap-3">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
              aria-describedby={
                state.errors?.consent ? "consent-error" : undefined
              }
            />
            <div>
              <label
                htmlFor="consent"
                className="text-sm text-gray-700 cursor-pointer"
              >
                Я согласен(а) на обработку персональных данных в соответствии с{" "}
                <Link
                  href={"/privacy-policy" as Route}
                  className="text-amber-600 underline hover:text-amber-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Политикой конфиденциальности
                </Link>
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <FieldError errors={state.errors?.consent} />
            </div>
          </div>

          {/* General error */}
          {state.message && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
              {state.message}
            </p>
          )}
        </div>

        {/* ── Right: order summary ── */}
        <aside className="rounded-xl border bg-gray-50 p-6 h-fit">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Ваш заказ
          </h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Товары ({itemCount} шт.)</dt>
              <dd className="font-medium text-gray-900">
                {formatPrice(subtotalTiyins)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Доставка</dt>
              <dd className="font-medium text-green-600">Бесплатно</dd>
            </div>
          </dl>

          <div className="my-4 border-t" />

          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>К оплате</span>
            <span>{formatPrice(subtotalTiyins)}</span>
          </div>

          <Button
            type="submit"
            className="mt-6 w-full"
            size="lg"
            disabled={isPending}
          >
            {isPending ? "Оформляем..." : "Оформить заявку"}
          </Button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Оплата при получении курьером
          </p>
        </aside>
      </div>
    </form>
  );
}
