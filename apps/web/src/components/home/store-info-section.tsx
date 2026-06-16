import {
  Phone,
  Check,
  Truck,
  ShieldCheck,
  Sparkles,
  Search,
  ClipboardCheck,
  PackageOpen,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import type { CategoryItem } from "@/lib/homepage-data";

const advantages = [
  "Оригинальная сантехника и мебель от мировых брендов",
  "Широкий выбор для ванной, санузла и кухни",
  "Доставка по всему Казахстану",
  "Подбор под любую задачу и бюджет",
  "Проверка качества перед каждой отправкой",
  "Профессиональные консультации по выбору",
  "Выгодные цены, акции и спецпредложения",
];

const steps = [
  {
    icon: Search,
    title: "Выберите товар",
    description: "Найдите подходящую модель в каталоге или с помощью менеджера.",
  },
  {
    icon: ClipboardCheck,
    title: "Оформите заказ",
    description: "Онлайн за пару минут или по телефону — как вам удобнее.",
  },
  {
    icon: PackageOpen,
    title: "Получите покупку",
    description: "Доставим по всему Казахстану удобным для вас способом.",
  },
];

const badges = [
  { icon: Truck, label: "Доставка по РК" },
  { icon: ShieldCheck, label: "Гарантия качества" },
];

export function StoreInfoSection({
  categories,
}: {
  categories: CategoryItem[];
}) {
  return (
    <section className="container mx-auto mt-12 px-4">
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-b from-stone-50 to-white">
        {/* Intro */}
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* Text */}
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Интернет-магазин Timsan
              </span>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-stone-900 sm:text-3xl">
                Сантехника, плитка и мебель для ванной в&nbsp;Алматы
              </h2>
              <p className="mt-3 text-base leading-relaxed text-stone-600">
                Широкий ассортимент товаров ведущих мировых и отечественных
                брендов — от смесителей до готовых решений для ванной комнаты.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {badges.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-700 shadow-sm"
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-stone-200 shadow-lg shadow-stone-200/50 lg:aspect-[5/4]">
              <Image
                src="/bathroom-interior.jpg"
                alt="Современный интерьер ванной комнаты"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-900/10 to-transparent"
              />
            </div>
          </div>
        </div>

        {/* Advantages + Categories */}
        <div className="grid grid-cols-1 gap-px bg-stone-200 lg:grid-cols-5">
          {/* Why us */}
          <div className="bg-white px-6 py-10 sm:px-10 lg:col-span-3">
            <h3 className="text-lg font-bold text-stone-900">
              Почему клиенты выбирают Timsan
            </h3>
            <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {advantages.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Check className="h-3 w-3 text-accent" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-stone-700">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* What to buy */}
          <div className="bg-white px-6 py-10 sm:px-10 lg:col-span-2">
            <h3 className="text-lg font-bold text-stone-900">
              Что можно купить
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}` as Route}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* How to buy */}
        <div className="border-t border-stone-200 px-6 py-10 sm:px-10 sm:py-14">
          <h3 className="text-lg font-bold text-stone-900">
            Как проходит покупка
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            Путь от выбора товара до его получения — всего три простых шага.
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }, idx) => (
              <li key={title} className="relative">
                {idx < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-12 top-6 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-accent/40 to-transparent sm:block"
                  />
                )}
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-accent shadow ring-1 ring-stone-200">
                    {idx + 1}
                  </span>
                </div>
                <h4 className="mt-4 font-semibold text-stone-900">{title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA */}
        <div className="px-6 pb-10 sm:px-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent/80 p-6 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-bold text-white">
                  Нужна консультация или помощь с выбором?
                </p>
                <p className="mt-1 text-sm text-white/80">
                  Ответим на вопросы и примем заказ по телефону — каждый день
                  с 09:00 до 22:00.
                </p>
              </div>
              <a
                href="tel:+77762016466"
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3 text-base font-bold text-accent shadow-md transition-transform hover:scale-[1.02]"
              >
                <Phone className="h-5 w-5" />
                Позвонить нам
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
