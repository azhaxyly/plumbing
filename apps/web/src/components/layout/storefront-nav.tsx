import type { Route } from "next";
import Link from "next/link";

const navLinks = [
  { href: "/category/vanny", label: "Ванны" },
  { href: "/category/smesiteli", label: "Смесители" },
  { href: "/category/dushevye-sistemy", label: "Душевые системы" },
  { href: "/category/rakoviny", label: "Раковины" },
  { href: "/category/unitazy", label: "Унитазы" },
  { href: "/category/polotencesushiteli", label: "Полотенцесушители" },
  { href: "/category/aksessuary", label: "Аксессуары для ванной" },
];

export function StorefrontNav() {
  return (
    <nav
      className="border-b border-stone-100 bg-white"
      aria-label="Категории каталога"
    >
      <div className="container mx-auto flex items-center overflow-x-auto px-6 scrollbar-none">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href as Route}
            className="shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium text-stone-600 transition-colors hover:text-emerald-700 border-b-2 border-transparent hover:border-emerald-700"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
