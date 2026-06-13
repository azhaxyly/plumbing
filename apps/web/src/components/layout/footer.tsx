import { getCategoryTree } from "@timsan/db";
import { Phone, Mail } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

const infoLinks = [
  { href: "/about-us", label: "О нас" },
  { href: "/delivery-info", label: "Доставка" },
  { href: "/payment-info", label: "Оплата" },
  { href: "/returns", label: "Возврат" },
];

const legalLinks = [
  { href: "/privacy-policy", label: "Политика конфиденциальности" },
  { href: "/public-offer", label: "Публичная оферта" },
];

// Contact info — sourced from env/Setting (placeholders until admin configures)
const phone = process.env["NEXT_PUBLIC_SHOP_PHONE"] ?? "+7 (776) 201-64-66";
const email = process.env["NEXT_PUBLIC_SHOP_EMAIL"] ?? "adilet.timat@gmail.com";

export async function Footer() {
  const currentYear = new Date().getFullYear();

  let catalogLinks: { href: string; label: string }[] = [];
  try {
    const tree = await getCategoryTree();
    catalogLinks = tree.slice(0, 5).map((category) => ({
      href: `/category/${category.slug}`,
      label: category.name,
    }));
  } catch {
    // categories remain empty if the query fails
  }

  return (
    <footer className="border-t bg-[#182d47]">
      <div className="container mx-auto px-4 pt-3 pb-12 md:px-6">
        {/* Prominent phone block */}
        <div className="mb-4 flex flex-col items-start gap-2 border-b border-white/10 pb-3 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            aria-label="Timsan — на главную"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Image
              src="/timsan-logo-dark.png"
              alt="Timsan Сантехника"
              width={160}
              height={110}
              className="h-[80px] w-[120px] md:h-[130px] md:w-[195px] object-contain"
            />
          </Link>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 text-3xl font-bold text-white transition-colors hover:text-emerald-400"
          >
            <Phone className="h-7 w-7 text-emerald-400" />
            {phone}
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <p className="text-sm text-blue-200/70 leading-relaxed">
              Интернет-магазин сантехники и мебели для ванной комнаты. Широкий
              выбор, доставка по Казахстану.
            </p>

          </div>

          {/* Catalog column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Каталог
            </h3>
            <ul className="flex flex-col gap-2">
              {catalogLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="text-sm text-blue-200/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Информация
            </h3>
            <ul className="flex flex-col gap-2">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="text-sm text-blue-200/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mb-4 mt-6 text-sm font-semibold uppercase tracking-wider text-white">
              Правовая информация
            </h3>
            <ul className="flex flex-col gap-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="text-sm text-blue-200/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Контакты
            </h3>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-sm text-blue-200/70 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm text-blue-200/70 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-blue-200/50">
            © {currentYear} Timsan. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
