import { prisma } from "@timsan/db";
import { Package, ShoppingCart, Tag, TrendingUp, Users, ArrowRight, Plus } from "lucide-react";
import type { Metadata , Route } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { OrdersFeed } from "@/components/admin/dashboard/orders-feed";
import type { OrderSummary } from "@/components/admin/dashboard/orders-feed";

export const metadata: Metadata = {
  title: "Дашборд — Timsan Admin",
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
}

function formatDate(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const user = session?.user as { name?: string | null; email?: string | null } | undefined;
  const userName = user?.name ?? user?.email ?? "Администратор";
  const firstName = userName.split(" ")[0];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todayOrders, activeProductsCount, usersCount] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startOfToday } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        contactName: true,
        contactPhone: true,
        subtotalCents: true,
        createdAt: true,
      },
    }),
    prisma.product.count({ where: { status: "active" } }),
    prisma.user.count(),
  ]);

  const newOrdersCount = todayOrders.filter((o) => o.status === "new").length;
  const revenueToday = todayOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.subtotalCents, 0);

  const initialOrders: OrderSummary[] = todayOrders.map((o) => ({
    id: o.id,
    status: o.status as OrderSummary["status"],
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    subtotalCents: o.subtotalCents,
    createdAt: o.createdAt.toISOString(),
  }));

  const stats = [
    {
      label: "Новые заказы",
      value: String(newOrdersCount),
      description: "Ждут обработки",
      icon: ShoppingCart,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      href: "/admin/orders",
    },
    {
      label: "Товаров в каталоге",
      value: String(activeProductsCount),
      description: "Активные позиции",
      icon: Package,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      href: "/admin/catalog/products",
    },
    {
      label: "Пользователей",
      value: String(usersCount),
      description: "Зарегистрировано",
      icon: Users,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      href: "/admin/users",
    },
    {
      label: "Выручка сегодня",
      value: formatMoney(revenueToday),
      description: "По доставленным заказам",
      icon: TrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      href: "/admin/orders",
    },
  ];

  const quickActions = [
    {
      href: "/admin/catalog/products/new",
      icon: Plus,
      label: "Добавить товар",
      description: "Создать новую позицию в каталоге",
      colorClass: "bg-primary/10 text-primary",
    },
    {
      href: "/admin/orders",
      icon: ShoppingCart,
      label: "Все заказы",
      description: "Просмотреть и обработать заказы",
      colorClass: "bg-orange-100 text-orange-600",
    },
    {
      href: "/admin/catalog/brands",
      icon: Tag,
      label: "Бренды",
      description: "Управление брендами и производителями",
      colorClass: "bg-blue-100 text-blue-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Добро пожаловать, {firstName}!
        </h1>
        <p className="mt-1 text-sm capitalize text-gray-500">{formatDate()}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href as Route}
              className="group rounded-xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{stat.description}</p>
                </div>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Быстрые действия</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href as Route}
                className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.colorClass}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{action.label}</p>
                  <p className="truncate text-sm text-gray-500">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Real-time order feed */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Заказы сегодня</h2>
        <OrdersFeed initialOrders={initialOrders} />
      </div>
    </div>
  );
}
