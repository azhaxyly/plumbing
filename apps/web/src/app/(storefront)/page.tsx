import { Button } from "@whitehouse/ui";
import { ArrowRight, ShoppingBag } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-700 text-white">
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Добро пожаловать
              <br />
              <span className="text-amber-400">в Whitehouse</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 leading-relaxed">
              Интернет-магазин сантехники и мебели для ванной комнаты. Широкий
              выбор брендов, доставка по всему Казахстану, оплата через Kaspi.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href={"/category" as Route}>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Перейти в каталог
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900" asChild>
                <Link href={"/brand" as Route}>
                  Все бренды
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative element */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent"
        />
      </section>

      {/* Popular categories */}
      <section className="container mx-auto px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Популярные категории
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { href: "/category/vanny", label: "Ванны" },
            { href: "/category/dushevye-kabiny", label: "Душевые кабины" },
            { href: "/category/mebel", label: "Мебель" },
            { href: "/category/santehnika", label: "Сантехника" },
          ].map((cat) => (
            <Link
              key={cat.href}
              href={cat.href as Route}
              className="group flex items-center justify-center rounded-xl border bg-gray-50 p-6 text-center font-medium text-gray-700 transition-all hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Delivery & payment info */}
      <section className="bg-gray-50 border-t">
        <div className="container mx-auto px-4 py-12 md:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900">Широкий выбор</h3>
              <p className="mt-1 text-sm text-gray-500">
                Тысячи товаров от ведущих брендов
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <ArrowRight className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900">Доставка по Казахстану</h3>
              <p className="mt-1 text-sm text-gray-500">
                Самовывоз и доставка транспортными компаниями
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900">Оплата через Kaspi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Удобная онлайн-оплата через Kaspi Pay
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
