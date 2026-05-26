"use client";

import type { CategoryTreeNode } from "@timsan/db";
import { Button } from "@timsan/ui";
import { ChevronDown, Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/brand", label: "Бренды" },
  { href: "/about-us", label: "О нас" },
  { href: "/delivery-info", label: "Доставка" },
  { href: "/contacts", label: "Контакты" },
];

interface MobileMenuProps {
  categories: CategoryTreeNode[] | null;
}

export function MobileMenu({ categories }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setCatalogOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Открыть меню"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={close} />

          {/* Drawer */}
          <nav className="absolute left-0 top-0 flex h-full w-3/4 max-w-xs flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <span className="text-lg font-semibold">Меню</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Закрыть меню"
                onClick={close}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ul className="flex flex-col py-2">
              {/* Каталог — аккордеон */}
              <li>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setCatalogOpen((v) => !v)}
                  aria-expanded={catalogOpen}
                >
                  <span>Каталог</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${catalogOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {catalogOpen && (
                  <ul className="border-t border-gray-100 bg-gray-50">
                    {(categories ?? []).slice(0, 20).map((cat) => (
                      <li key={cat.id}>
                        <Link
                          href={`/category/${cat.slug}` as Route}
                          className="block px-8 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                          onClick={close}
                        >
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                    {(categories === null || categories.length === 0) && (
                      <li className="px-8 py-2.5 text-sm text-gray-400">
                        Не удалось загрузить категории
                      </li>
                    )}
                  </ul>
                )}
              </li>

              {/* Остальные ссылки */}
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="block px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    onClick={close}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
