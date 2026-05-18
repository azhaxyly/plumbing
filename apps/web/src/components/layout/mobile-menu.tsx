"use client";

import { Button } from "@whitehouse/ui";
import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/category", label: "Каталог" },
  { href: "/brand", label: "Бренды" },
  { href: "/about-us", label: "О нас" },
  { href: "/delivery-info", label: "Доставка" },
  { href: "/contacts", label: "Контакты" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);

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
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <nav className="absolute left-0 top-0 h-full w-3/4 max-w-xs bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="text-lg font-semibold">Меню</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Закрыть меню"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ul className="flex flex-col py-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="block px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    onClick={() => setOpen(false)}
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
