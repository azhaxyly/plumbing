import { Phone, Mail, Instagram } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

const catalogLinks = [
  { href: "/category/vanny", label: "Ванны" },
  { href: "/category/dushevye-kabiny", label: "Душевые кабины" },
  { href: "/category/mebel", label: "Мебель" },
];

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
const email = process.env["NEXT_PUBLIC_SHOP_EMAIL"] ?? "info@timsan.kz";
const instagram = process.env["NEXT_PUBLIC_SHOP_INSTAGRAM"] ?? "@timsan.kz";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 pt-3 pb-12 md:px-6">
        {/* Prominent phone block */}
        <div className="mb-4 flex flex-col items-start gap-2 border-b pb-3 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            aria-label="Timsan — на главную"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Timsan Сантехника"
              width={173}
              height={115}
              className="h-[115px] w-[173px] object-contain"
            />
          </Link>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 text-3xl font-bold text-stone-900 transition-colors hover:text-emerald-700"
          >
            <Phone className="h-7 w-7 text-emerald-700" />
            {phone}
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              Интернет-магазин сантехники и мебели для ванной комнаты. Широкий
              выбор, доставка по Казахстану.
            </p>

          </div>

          {/* Catalog column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Каталог
            </h3>
            <ul className="flex flex-col gap-2">
              {catalogLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Информация
            </h3>
            <ul className="flex flex-col gap-2">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mb-4 mt-6 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Правовая информация
            </h3>
            <ul className="flex flex-col gap-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
              Контакты
            </h3>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {email}
                </a>
              </li>
              <li>
                <a
                  href={`https://instagram.com/${instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-pink-500 transition-colors"
                >
                  <Instagram className="h-4 w-4 shrink-0" />
                  {instagram}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t pt-6 text-center">
          <p className="text-xs text-gray-400">
            © {currentYear} Timsan. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
