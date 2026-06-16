/**
 * Split-screen layout for authentication pages (login, register, etc.)
 * Left: branded showcase panel. Right: centered form card.
 */
import { Headphones, PackageSearch, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const highlights = [
  {
    icon: Wrench,
    title: "Оригинальная сантехника",
    text: "Проверенные бренды и гарантия на каждый товар",
  },
  {
    icon: PackageSearch,
    title: "Большой каталог",
    text: "Тысячи товаров для сантехники, отопления и водоснабжения",
  },
  {
    icon: Headphones,
    title: "Помощь специалиста",
    text: "Подберём товар и ответим на ваши вопросы",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[1.1fr_1fr]">
      {/* Branded showcase panel — hidden on phones, visible from tablet */}
      <aside className="relative hidden overflow-hidden bg-primary md:flex md:flex-col md:justify-between md:p-8 lg:p-12 xl:p-16">
        {/* Decorative gradient + blurred blobs */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/70" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        {/* Subtle dotted texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <Link href="/" aria-label="Timsan — на главную" className="relative">
          <Image
            src="/timsan-logo-dark.png"
            alt="Timsan Сантехника"
            width={280}
            height={182}
            className="h-28 w-auto object-contain"
            priority
          />
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
            Сантехника и комплектующие для дома и бизнеса
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Тысячи товаров для сантехники, отопления и водоснабжения — в одном
            каталоге.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">
          © {new Date().getFullYear()} TIMSAN. Все права защищены.
        </p>
      </aside>

      {/* Form side */}
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-muted/40 via-background to-background px-4 py-12 sm:px-6 md:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile logo (panel is hidden on phones) */}
          <Link
            href="/"
            className="mb-8 flex justify-center md:hidden"
            aria-label="Timsan — на главную"
          >
            <Image
              src="/logo.png"
              alt="Timsan Сантехника"
              width={140}
              height={93}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>

          {children}
        </div>
      </main>
    </div>
  );
}
