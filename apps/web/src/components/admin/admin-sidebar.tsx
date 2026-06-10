"use client";

import { cn } from "@timsan/ui";
import {
  Boxes,
  ClipboardList,
  FileText,
  Image,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";


interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    section: "Главное",
    items: [{ label: "Дашборд", href: "/admin", icon: LayoutDashboard }],
  },
  {
    section: "Продажи",
    items: [{ label: "Заказы", href: "/admin/orders", icon: ShoppingCart }],
  },
  {
    section: "Каталог",
    items: [
      { label: "Товары", href: "/admin/catalog/products", icon: Boxes },
      { label: "Синхр. остатков", href: "/admin/catalog/stock-sync", icon: RefreshCw },
      { label: "Категории", href: "/admin/catalog/categories", icon: Layers },
      { label: "Бренды", href: "/admin/catalog/brands", icon: Tag },
      { label: "Атрибуты", href: "/admin/catalog/attributes", icon: SlidersHorizontal },
    ],
  },
  {
    section: "Маркетинг",
    items: [{ label: "Купоны", href: "/admin/marketing/coupons", icon: Ticket }],
  },
  {
    section: "Сайт",
    items: [
      { label: "Страницы", href: "/admin/content/pages", icon: FileText },
      { label: "Баннеры", href: "/admin/content/banners", icon: Image },
      { label: "Хиты продаж", href: "/admin/content/bestsellers", icon: TrendingUp },
    ],
  },
  {
    section: "Управление",
    items: [
      { label: "Пользователи", href: "/admin/users", icon: Users },
      { label: "Настройки", href: "/admin/settings", icon: Settings },
      { label: "Аудит", href: "/admin/audit", icon: ClipboardList },
    ],
  },
];

interface AdminSidebarNavProps {
  onNavigate?: () => void;
}

export function AdminSidebarNav({ onNavigate }: AdminSidebarNavProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <nav aria-label="Навигация по админке" className="flex h-full flex-col">
      <div className="flex-1 space-y-5 px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.section}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href as Route}
                      {...(onNavigate ? { onClick: onNavigate } : {})}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          active ? "bg-primary/15" : "bg-gray-100",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active ? "text-primary" : "text-gray-500",
                          )}
                        />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer: storefront link */}
      <div className="border-t border-gray-100 px-3 py-4">
        <Link
          href={"/" as Route}
          {...(onNavigate ? { onClick: onNavigate } : {})}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100">
            <Store className="h-4 w-4 text-gray-500" />
          </span>
          Перейти на сайт
        </Link>
      </div>
    </nav>
  );
}
