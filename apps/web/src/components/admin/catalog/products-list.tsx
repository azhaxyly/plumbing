"use client";

/**
 * ProductsListClient — interactive product list for the admin panel.
 *
 * Features:
 * - Table with columns: image, name, SKU, category, brand, min price, status, created date
 * - Filters: by category, brand, status, search by name/SKU
 * - Page-based pagination (20 products per page)
 * - Buttons: Edit, Delete
 *
 * See task 25.3.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@timsan/ui";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useTransition } from "react";


import { deleteProductAction } from "@/lib/product-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  sku: string;
  status: "active" | "draft" | "archived";
  priceCents: number;
  compareAtPriceCents: number | null;
  createdAt: Date;
  updatedAt: Date;
  brand: { id: string; name: string; slug: string };
  images: { url: string; alt: string }[];
  _count: { variants: number };
}

interface PaginatedProducts {
  items: ProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BrandOption {
  id: string;
  name: string;
}

interface CategoryNode {
  id: string;
  name: string;
  children: CategoryNode[];
}

interface Filters {
  page: number;
  search: string;
  status: "active" | "draft" | "archived" | undefined;
  brandId: string | undefined;
  categoryId: string | undefined;
}

interface ProductsListClientProps {
  initialData: PaginatedProducts;
  brands: BrandOption[];
  categories: CategoryNode[];
  initialFilters: Filters;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
}

function statusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "active":
      return {
        label: "Активен",
        className: "bg-green-100 text-green-700",
      };
    case "draft":
      return {
        label: "Черновик",
        className: "bg-yellow-100 text-yellow-700",
      };
    case "archived":
      return {
        label: "Архив",
        className: "bg-gray-100 text-gray-600",
      };
    default:
      return { label: status, className: "bg-gray-100 text-gray-600" };
  }
}

function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenCategories(node.children, depth + 1));
  }
  return result;
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  productName: string;
  isPending: boolean;
  error: string | null;
}

function DeleteDialog({
  open,
  onClose,
  onConfirm,
  productName,
  isPending,
  error,
}: DeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Удалить товар</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить товар{" "}
            <strong>&ldquo;{productName}&rdquo;</strong>? Это действие нельзя
            отменить.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductsListClient({
  initialData,
  brands,
  categories,
  initialFilters,
}: ProductsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    product?: ProductRow;
  }>({ open: false });
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Local filter state (controlled inputs)
  const [search, setSearch] = React.useState(initialFilters.search);
  const [status, setStatus] = React.useState(initialFilters.status ?? "");
  const [brandId, setBrandId] = React.useState(initialFilters.brandId ?? "");
  const [categoryId, setCategoryId] = React.useState(
    initialFilters.categoryId ?? "",
  );

  const flatCategories = flattenCategories(categories);

  // ── URL navigation helpers ───────────────────────────────────────────────────

  const buildUrl = useCallback(
    (overrides: Partial<Filters & { page: number }>) => {
      const params = new URLSearchParams(searchParams.toString());

      const newSearch = overrides.search ?? search;
      const newStatus = overrides.status ?? status;
      const newBrandId = overrides.brandId ?? brandId;
      const newCategoryId = overrides.categoryId ?? categoryId;
      const newPage = overrides.page ?? 1;

      if (newSearch) params.set("search", newSearch);
      else params.delete("search");

      if (newStatus) params.set("status", newStatus);
      else params.delete("status");

      if (newBrandId) params.set("brandId", newBrandId);
      else params.delete("brandId");

      if (newCategoryId) params.set("categoryId", newCategoryId);
      else params.delete("categoryId");

      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");

      return `/admin/catalog/products?${params.toString()}`;
    },
    [searchParams, search, status, brandId, categoryId],
  );

  function applyFilters() {
    startTransition(() => {
      router.push(buildUrl({ page: 1 }) as Route);
    });
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setBrandId("");
    setCategoryId("");
    startTransition(() => {
      router.push("/admin/catalog/products" as Route);
    });
  }

  function goToPage(page: number) {
    startTransition(() => {
      router.push(buildUrl({ page }) as Route);
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDeleteClick = useCallback((product: ProductRow) => {
    setDeleteError(null);
    setDeleteDialog({ open: true, product });
  }, []);

  async function handleConfirmDelete() {
    if (!deleteDialog.product) return;
    setDeleteError(null);
    try {
      const result = await deleteProductAction({ id: deleteDialog.product.id });
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteDialog({ open: false });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDeleteError("Произошла ошибка при удалении товара");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Поиск
            </label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="Название или SKU..."
              disabled={isPending}
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Статус
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Все статусы</option>
              <option value="active">Активен</option>
              <option value="draft">Черновик</option>
              <option value="archived">Архив</option>
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Бренд
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Все бренды</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Категория
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Все категории</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {"  ".repeat(c.depth)}
                  {c.depth > 0 ? "└ " : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={applyFilters} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Применить
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            disabled={isPending}
          >
            Сбросить
          </Button>
          <span className="ml-auto text-sm text-gray-500">
            Найдено: {initialData.total}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        {initialData.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Товаров не найдено.{" "}
            <Link
              href="/admin/catalog/products/new"
              className="text-blue-600 hover:underline"
            >
              Создайте первый
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Фото</th>
                  <th className="px-4 py-3">Название / SKU</th>
                  <th className="px-4 py-3">Бренд</th>
                  <th className="px-4 py-3 text-right">Цена</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Создан</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialData.items.map((product) => {
                  const primaryImage = product.images[0];
                  const { label, className } = statusLabel(product.status);

                  return (
                    <tr key={product.id} className="group hover:bg-gray-50">
                      {/* Image */}
                      <td className="px-4 py-3">
                        {primaryImage ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded border">
                            <Image
                              src={primaryImage.url}
                              alt={primaryImage.alt || product.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded border bg-gray-100 text-xs text-gray-400">
                            Нет
                          </div>
                        )}
                      </td>

                      {/* Name / SKU */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 line-clamp-1">
                          {product.name}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          <code className="rounded bg-gray-100 px-1 py-0.5">
                            {product.sku}
                          </code>
                          {product._count.variants > 0 && (
                            <span className="ml-2 text-gray-400">
                              {product._count.variants} вар.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3 text-gray-600">
                        {product.brand.name}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatPrice(product.priceCents)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
                        >
                          {label}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(product.createdAt).toLocaleDateString(
                          "ru-KZ",
                          { day: "2-digit", month: "2-digit", year: "2-digit" },
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/catalog/products/${product.id}/edit` as Route}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                            aria-label={`Редактировать ${product.name}`}
                            title="Редактировать"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(product)}
                            disabled={isPending}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Удалить ${product.name}`}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading overlay */}
        {isPending && (
          <div className="flex items-center justify-center border-t px-4 py-2 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загрузка...
          </div>
        )}
      </div>

      {/* Pagination */}
      {initialData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Страница {initialData.page} из {initialData.totalPages} (
            {initialData.total} товаров)
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => goToPage(initialData.page - 1)}
              disabled={initialData.page <= 1 || isPending}
            >
              ← Назад
            </Button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, initialData.totalPages) }, (_, i) => {
              const startPage = Math.max(
                1,
                Math.min(
                  initialData.page - 2,
                  initialData.totalPages - 4,
                ),
              );
              const pageNum = startPage + i;
              if (pageNum > initialData.totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={pageNum === initialData.page ? "default" : "outline"}
                  onClick={() => goToPage(pageNum)}
                  disabled={isPending}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              size="sm"
              variant="outline"
              onClick={() => goToPage(initialData.page + 1)}
              disabled={initialData.page >= initialData.totalPages || isPending}
            >
              Вперёд →
            </Button>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleConfirmDelete}
        productName={deleteDialog.product?.name ?? ""}
        isPending={isPending}
        error={deleteError}
      />
    </div>
  );
}
