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
      {/* Honeypot trap for bots — real users never fill this */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      />
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
                  placeholder="+7 777 123 45 67"
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
              Адрес доставки
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              {/* City */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="city"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Город
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Алматы"
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </div>

              {/* Street */}
              <div className="sm:col-span-3">
                <label
                  htmlFor="street"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Улица и дом
                </label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  autoComplete="address-line1"
                  placeholder="ул. Абая, 10"
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </div>

              {/* Apartment */}
              <div className="sm:col-span-1">
                <label
                  htmlFor="apartment"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Кв.
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

          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-center">
            <p className="text-sm font-medium text-blue-800">
              Менеджер свяжется с вами для подтверждения заказа
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
