"use client";

/**
 * BrandsClient — interactive brand management for the admin panel.
 *
 * Features:
 * - Table of brands: logo, name, slug, product count, Edit/Delete buttons
 * - "Add brand" button
 * - Create/Edit dialog: Name, Slug (auto-generated), Description, Logo upload
 *   (file input → presigned URL → PUT to S3 → preview)
 * - Delete confirmation dialog
 *
 * Uses Server Actions for mutations.
 * See task 25.2.
 */

import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useRef, useState, useTransition } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
} from "@timsan/ui";

import {
  createBrandAction,
  deleteBrandAction,
  updateBrandAction,
} from "@/lib/brand-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandRow {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number };
}

interface BrandsClientProps {
  initialBrands: BrandRow[];
}

// ─── Slug generation (same transliteration as category-tree.tsx) ──────────────

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
  // Kazakh-specific
  ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// ─── Logo upload helper ───────────────────────────────────────────────────────

interface UploadResult {
  publicUrl: string;
}

async function uploadLogo(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "brands");
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Ошибка загрузки");
  }
  const { publicUrl } = (await res.json()) as { publicUrl: string };
  return { publicUrl };
}

// ─── Brand form dialog ────────────────────────────────────────────────────────

interface BrandFormData {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
}

interface BrandDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BrandFormData) => Promise<void>;
  initialData?: Partial<BrandFormData> | undefined;
  title: string;
  isPending: boolean;
  error: string | null;
}

function BrandDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
  isPending,
  error,
}: BrandDialogProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setSlug(initialData?.slug ?? "");
      setDescription(initialData?.description ?? "");
      setLogoUrl(initialData?.logoUrl ?? "");
      setSlugManuallyEdited(false);
      setUploadError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(value);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Пожалуйста, выберите файл изображения");
      return;
    }

    // Validate file size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Размер файла не должен превышать 5 МБ");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadLogo(file);
      setLogoUrl(result.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Ошибка загрузки логотипа",
      );
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, slug, description, logoUrl });
  }

  const isDisabled = isPending || uploading;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Заполните поля для бренда. Slug генерируется автоматически из
            названия.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <label
              htmlFor="brand-name"
              className="block text-sm font-medium text-gray-700"
            >
              Название <span className="text-red-500">*</span>
            </label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Например: Roca"
              required
              disabled={isDisabled}
            />
          </div>

          {/* Slug */}
          <div className="space-y-1">
            <label
              htmlFor="brand-slug"
              className="block text-sm font-medium text-gray-700"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <Input
              id="brand-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="roca"
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Только строчные буквы, цифры и дефисы"
              required
              disabled={isDisabled}
            />
            <p className="text-xs text-gray-500">
              Только строчные латинские буквы, цифры и дефисы
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label
              htmlFor="brand-description"
              className="block text-sm font-medium text-gray-700"
            >
              Описание
            </label>
            <textarea
              id="brand-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание бренда"
              rows={3}
              disabled={isDisabled}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Логотип
            </label>

            {/* Preview */}
            {logoUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Логотип бренда"
                  className="h-16 w-16 rounded-md border object-contain p-1"
                />
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-xs text-red-500 hover:underline"
                  disabled={isDisabled}
                >
                  Удалить
                </button>
              </div>
            )}

            {/* File input */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isDisabled}
                className="hidden"
                id="brand-logo-file"
              />
              <label
                htmlFor="brand-logo-file"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                  isDisabled && "cursor-not-allowed opacity-50",
                )}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                {uploading ? "Загрузка..." : "Выбрать файл"}
              </label>
              <span className="text-xs text-gray-500">
                PNG, JPG, SVG до 5 МБ
              </span>
            </div>

            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDisabled}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isDisabled || !name || !slug}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  brandName: string;
  isPending: boolean;
  error: string | null;
}

function DeleteDialog({
  open,
  onClose,
  onConfirm,
  brandName,
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
          <DialogTitle>Удалить бренд</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить бренд{" "}
            <strong>&ldquo;{brandName}&rdquo;</strong>? Это действие нельзя
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
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BrandsClient({ initialBrands }: BrandsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    brand?: BrandRow;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    brand?: BrandRow;
  }>({ open: false });

  const [dialogError, setDialogError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdd = useCallback(() => {
    setDialogError(null);
    setCreateDialog(true);
  }, []);

  const handleEdit = useCallback((brand: BrandRow) => {
    setDialogError(null);
    setEditDialog({ open: true, brand });
  }, []);

  const handleDelete = useCallback((brand: BrandRow) => {
    setDialogError(null);
    setDeleteDialog({ open: true, brand });
  }, []);

  // ── Create ───────────────────────────────────────────────────────────────────

  async function handleCreate(data: BrandFormData) {
    setDialogError(null);
    try {
      const result = await createBrandAction({
        name: data.name,
        slug: data.slug,
        ...(data.description ? { description: data.description } : {}),
        ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
      });
      if (result.error) {
        setDialogError(result.error);
        return;
      }
      setCreateDialog(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDialogError("Произошла ошибка при создании бренда");
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  async function handleUpdate(data: BrandFormData) {
    if (!editDialog.brand) return;
    setDialogError(null);
    try {
      const result = await updateBrandAction({
        id: editDialog.brand.id,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
      });
      if (result.error) {
        setDialogError(result.error);
        return;
      }
      setEditDialog({ open: false });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDialogError("Произошла ошибка при обновлении бренда");
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleConfirmDelete() {
    if (!deleteDialog.brand) return;
    setDialogError(null);
    try {
      const result = await deleteBrandAction({ id: deleteDialog.brand.id });
      if (result.error) {
        setDialogError(result.error);
        return;
      }
      setDeleteDialog({ open: false });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDialogError("Произошла ошибка при удалении бренда");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium text-gray-700">
          {initialBrands.length} брендов
        </span>
        <Button size="sm" onClick={handleAdd} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить бренд
        </Button>
      </div>

      {/* Table */}
      {initialBrands.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Брендов пока нет.{" "}
          <button
            type="button"
            onClick={handleAdd}
            className="text-blue-600 hover:underline"
          >
            Создайте первый
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Логотип</th>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-right">Товаров</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialBrands.map((brand) => (
                <tr
                  key={brand.id}
                  className="group hover:bg-gray-50"
                >
                  {/* Logo */}
                  <td className="px-4 py-3">
                    {brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="h-10 w-10 rounded border object-contain p-0.5"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded border bg-gray-100 text-gray-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {brand.name}
                    </span>
                    {brand.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {brand.description}
                      </p>
                    )}
                  </td>

                  {/* Slug */}
                  <td className="px-4 py-3 text-gray-500">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      {brand.slug}
                    </code>
                  </td>

                  {/* Product count */}
                  <td className="px-4 py-3 text-right text-gray-600">
                    {brand._count.products}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(brand)}
                        disabled={isPending}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Редактировать ${brand.name}`}
                        title="Редактировать"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(brand)}
                        disabled={isPending}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Удалить ${brand.name}`}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center border-t px-4 py-2 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Обновление...
        </div>
      )}

      {/* Create dialog */}
      <BrandDialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        onSubmit={handleCreate}
        title="Новый бренд"
        isPending={isPending}
        error={dialogError}
      />

      {/* Edit dialog */}
      <BrandDialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false })}
        onSubmit={handleUpdate}
        initialData={
          editDialog.brand
            ? {
                name: editDialog.brand.name,
                slug: editDialog.brand.slug,
                description: editDialog.brand.description ?? "",
                logoUrl: editDialog.brand.logoUrl ?? "",
              }
            : undefined
        }
        title="Редактировать бренд"
        isPending={isPending}
        error={dialogError}
      />

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleConfirmDelete}
        brandName={deleteDialog.brand?.name ?? ""}
        isPending={isPending}
        error={dialogError}
      />
    </div>
  );
}
