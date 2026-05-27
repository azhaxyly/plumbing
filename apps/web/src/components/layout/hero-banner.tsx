import Link from "next/link";
import type { BannerWithProducts } from "@/lib/homepage-data";
import { HeroBannerClient } from "../home/hero-banner-client";

interface HeroBannerProps {
  banners: BannerWithProducts[];
}

function StaticHeroBanner() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-600 min-h-[320px] md:min-h-[400px] flex items-center">
      {/* Декоративные круги */}
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
      <div className="absolute -right-8 bottom-0 h-64 w-64 rounded-full bg-white/5" />
      <div className="absolute right-64 -bottom-16 h-48 w-48 rounded-full bg-white/5" />

      <div className="relative z-10 flex w-full flex-col gap-8 px-8 py-12 md:flex-row md:items-center md:px-16">
        {/* Текст */}
        <div className="flex flex-col gap-4 text-white md:max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-200">
            Интернет-магазин сантехники
          </p>
          <h2 className="text-4xl font-bold leading-tight md:text-5xl">
            Сантехника<br />и мебель<br />для ванной
          </h2>
          <p className="text-lg text-emerald-100">
            Широкий выбор от ведущих брендов.<br />Доставка по Алматы.
          </p>
          <div className="flex gap-3 pt-2">
            <Link
              href="/catalog"
              className="inline-flex items-center rounded-xl bg-white px-6 py-3 font-semibold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
            >
              Перейти в каталог
            </Link>
            <Link
              href="/category/smesiteli"
              className="inline-flex items-center rounded-xl border-2 border-white/40 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Акции
            </Link>
          </div>
        </div>

        {/* Карточки-фичи */}
        <div className="ml-auto grid grid-cols-2 gap-3 md:grid-cols-2 lg:w-auto">
          {[
            { label: "Смесители", icon: "🚿" },
            { label: "Ванны", icon: "🛁" },
            { label: "Унитазы", icon: "🪠" },
            { label: "Мебель", icon: "🪞" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-6 py-4 text-white backdrop-blur-sm"
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroBanner({ banners }: HeroBannerProps) {
  if (!banners || banners.length === 0) {
    return <StaticHeroBanner />;
  }

  return <HeroBannerClient banners={banners} />;
}
