"use client";

/**
 * CategoryTreeClient — interactive category tree for the admin panel.
 *
 * Features:
 * - Tree-view with indentation by nesting level
 * - ↑/↓ buttons for reordering (no external DnD library needed)
 * - Add subcategory, Edit, Delete buttons per node
 * - Create/Edit dialog with: Name, Slug (auto-generated), Parent category, Description
 *
 * Uses Server Actions for mutations.
 * See task 25.1.
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
  cn,
} from "@timsan/ui";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useState, useTransition } from "react";


import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  updateCategoryAction,
} from "@/lib/category-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryNode {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  productsCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryNode[];
}

interface CategoryTreeClientProps {
  initialCategories: CategoryNode[];
}

// ─── Image upload ─────────────────────────────────────────────────────────────

async function uploadCategoryImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "categories");
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Ошибка загрузки");
  }
  const { publicUrl } = (await res.json()) as { publicUrl: string };
  return publicUrl;
}

// ─── Slug generation ──────────────────────────────────────────────────────────

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

// ─── Flat list helper ─────────────────────────────────────────────────────────

function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  function walk(list: CategoryNode[]) {
    for (const node of list) {
      result.push(node);
      walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

// ─── Dialog form ──────────────────────────────────────────────────────────────

interface CategoryFormData {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  imageUrl: string | null;
}

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  initialData: Partial<CategoryFormData> | undefined;
  title: string;
  allCategories: CategoryNode[];
  editingId: string | undefined;
  isPending: boolean;
  error: string | null;
  initialImageUrl?: string | null;
}

function CategoryDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
  allCategories,
  editingId,
  isPending,
  error,
  initialImageUrl,
}: CategoryDialogProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [parentId, setParentId] = useState(initialData?.parentId ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setSlug(initialData?.slug ?? "");
      setParentId(initialData?.parentId ?? "");
      setDescription(initialData?.description ?? "");
      setImageUrl(initialImageUrl ?? null);
      setUploadError(null);
      setSlugManuallyEdited(false);
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
    if (!file.type.startsWith("image/")) {
      setUploadError("Выберите изображение");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Файл не должен превышать 10 МБ");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      setImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, slug, parentId, description, imageUrl });
  }

  const flatCategories = flattenTree(allCategories);

  function isDescendantOf(node: CategoryNode, ancestorId: string): boolean {
    if (node.id === ancestorId) return true;
    for (const child of node.children) {
      if (isDescendantOf(child, ancestorId)) return true;
    }
    return false;
  }

  const parentOptions = flatCategories.filter((c) => {
    if (!editingId) return true;
    const editingNode = flatCategories.find((n) => n.id === editingId);
    if (!editingNode) return true;
    return !isDescendantOf(editingNode, c.id) && c.id !== editingId;
  });

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
            Заполните поля для категории. Slug генерируется автоматически из
            названия.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="cat-name"
              className="block text-sm font-medium text-gray-700"
            >
              Название <span className="text-red-500">*</span>
            </label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Например: Ванны"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="cat-slug"
              className="block text-sm font-medium text-gray-700"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="vanny"
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Только строчные буквы, цифры и дефисы"
              required
              disabled={isPending}
            />
            <p className="text-xs text-gray-500">
              Только строчные латинские буквы, цифры и дефисы
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="cat-parent"
              className="block text-sm font-medium text-gray-700"
            >
              Родительская категория
            </label>
            <select
              id="cat-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">— Корневая категория —</option>
              {parentOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="cat-description"
              className="block text-sm font-medium text-gray-700"
            >
              Описание
            </label>
            <textarea
              id="cat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание категории"
              rows={3}
              disabled={isPending}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Фото категории
            </label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  <Image
                    src={imageUrl}
                    alt="Фото категории"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    disabled={isPending || uploading}
                    className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-gray-600 shadow hover:bg-red-50 hover:text-red-600"
                    aria-label="Удалить фото"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-300">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isPending || uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="mr-2 h-3.5 w-3.5" />
                  )}
                  {uploading ? "Загрузка..." : imageUrl ? "Заменить" : "Загрузить"}
                </Button>
                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}
                <p className="text-xs text-gray-400">JPG, PNG, WebP · до 10 МБ</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isPending || !name || !slug}>
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
  categoryName: string;
  isPending: boolean;
  error: string | null;
}

function DeleteDialog({
  open,
  onClose,
  onConfirm,
  categoryName,
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
          <DialogTitle>Удалить категорию</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить категорию{" "}
            <strong>&ldquo;{categoryName}&rdquo;</strong>? Это действие нельзя
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

// ─── Category tree node ───────────────────────────────────────────────────────

interface CategoryNodeRowProps {
  node: CategoryNode;
  depth: number;
  siblings: CategoryNode[];
  siblingIndex: number;
  allCategories: CategoryNode[];
  onAddChild: (parentId: string) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onMoveUp: (node: CategoryNode, siblings: CategoryNode[]) => void;
  onMoveDown: (node: CategoryNode, siblings: CategoryNode[]) => void;
}

function CategoryNodeRow({
  node,
  depth,
  siblings,
  siblingIndex,
  allCategories,
  onAddChild,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: CategoryNodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isFirst = siblingIndex === 0;
  const isLast = siblingIndex === siblings.length - 1;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md py-1.5 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:text-gray-600",
            !hasChildren && "invisible",
          )}
          aria-label={expanded ? "Свернуть" : "Развернуть"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Category name */}
        <span className="flex-1 text-sm font-medium text-gray-800">
          {node.name}
          <span className="ml-2 text-xs font-normal text-gray-400">
            /{node.slug}
          </span>
          {node.productsCount > 0 && (
            <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {node.productsCount}
            </span>
          )}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 pr-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onMoveUp(node, siblings)}
            disabled={isFirst}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Переместить вверх"
            title="Переместить вверх"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDown(node, siblings)}
            disabled={isLast}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Переместить вниз"
            title="Переместить вниз"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600"
            aria-label="Добавить подкатегорию"
            title="Добавить подкатегорию"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(node)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
            aria-label="Редактировать"
            title="Редактировать"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(node)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
            aria-label="Удалить"
            title="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child, idx) => (
            <CategoryNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              siblings={node.children}
              siblingIndex={idx}
              allCategories={allCategories}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryTreeClient({
  initialCategories,
}: CategoryTreeClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    parentId?: string;
  }>({ open: false });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    node?: CategoryNode;
  }>({ open: false });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    node?: CategoryNode;
  }>({ open: false });

  const [dialogError, setDialogError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddChild = useCallback((parentId: string) => {
    setDialogError(null);
    setCreateDialog({ open: true, parentId });
  }, []);

  const handleAddRoot = useCallback(() => {
    setDialogError(null);
    setCreateDialog({ open: true });
  }, []);

  const handleEdit = useCallback((node: CategoryNode) => {
    setDialogError(null);
    setEditDialog({ open: true, node });
  }, []);

  const handleDelete = useCallback((node: CategoryNode) => {
    setDialogError(null);
    setDeleteDialog({ open: true, node });
  }, []);

  const handleMoveUp = useCallback(
    (node: CategoryNode, siblings: CategoryNode[]) => {
      const idx = siblings.findIndex((s) => s.id === node.id);
      if (idx <= 0) return;
      const prev = siblings[idx - 1];
      if (!prev) return;
      const items = [
        { id: node.id, position: prev.position },
        { id: prev.id, position: node.position },
      ];
      startTransition(async () => {
        await reorderCategoriesAction(items);
        router.refresh();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleMoveDown = useCallback(
    (node: CategoryNode, siblings: CategoryNode[]) => {
      const idx = siblings.findIndex((s) => s.id === node.id);
      if (idx < 0 || idx >= siblings.length - 1) return;
      const next = siblings[idx + 1];
      if (!next) return;
      const items = [
        { id: node.id, position: next.position },
        { id: next.id, position: node.position },
      ];
      startTransition(async () => {
        await reorderCategoriesAction(items);
        router.refresh();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Create ───────────────────────────────────────────────────────────────────

  async function handleCreate(data: CategoryFormData) {
    setDialogError(null);
    try {
      const result = await createCategoryAction({
        name: data.name,
        slug: data.slug,
        ...(data.parentId ? { parentId: data.parentId } : {}),
        ...(data.description ? { description: data.description } : {}),
        imageUrl: data.imageUrl ?? null,
      });
      if (result.error) {
        setDialogError(result.error);
        return;
      }
      setCreateDialog({ open: false });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDialogError("Произошла ошибка при создании категории");
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  async function handleUpdate(data: CategoryFormData) {
    if (!editDialog.node) return;
    setDialogError(null);
    try {
      const result = await updateCategoryAction({
        id: editDialog.node.id,
        name: data.name,
        slug: data.slug,
        parentId: data.parentId || null,
        description: data.description || null,
        imageUrl: data.imageUrl ?? null,
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
      setDialogError("Произошла ошибка при обновлении категории");
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleConfirmDelete() {
    if (!deleteDialog.node) return;
    setDialogError(null);
    try {
      const result = await deleteCategoryAction({ id: deleteDialog.node.id });
      if (result.error) {
        setDialogError(result.error);
        return;
      }
      setDeleteDialog({ open: false });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDialogError("Произошла ошибка при удалении категории");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium text-gray-700">
          {flattenTree(initialCategories).length} категорий
        </span>
        <Button size="sm" onClick={handleAddRoot} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить категорию
        </Button>
      </div>

      {/* Tree */}
      <div className="p-2">
        {initialCategories.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Категорий пока нет.{" "}
            <button
              type="button"
              onClick={handleAddRoot}
              className="text-blue-600 hover:underline"
            >
              Создайте первую
            </button>
          </div>
        ) : (
          initialCategories.map((node, idx) => (
            <CategoryNodeRow
              key={node.id}
              node={node}
              depth={0}
              siblings={initialCategories}
              siblingIndex={idx}
              allCategories={initialCategories}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))
        )}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center border-t px-4 py-2 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Обновление...
        </div>
      )}

      {/* Create dialog */}
      <CategoryDialog
        open={createDialog.open}
        onClose={() => setCreateDialog({ open: false })}
        onSubmit={handleCreate}
        initialData={{ parentId: createDialog.parentId ?? "" }}
        title="Новая категория"
        allCategories={initialCategories}
        editingId={undefined}
        isPending={isPending}
        error={dialogError}
      />

      {/* Edit dialog */}
      <CategoryDialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false })}
        onSubmit={handleUpdate}
        initialData={
          editDialog.node
            ? {
                name: editDialog.node.name,
                slug: editDialog.node.slug,
                parentId: editDialog.node.parentId ?? "",
                description: editDialog.node.description ?? "",
              }
            : {}
        }
        initialImageUrl={editDialog.node?.imageUrl ?? null}
        title="Редактировать категорию"
        allCategories={initialCategories}
        editingId={editDialog.node?.id}
        isPending={isPending}
        error={dialogError}
      />

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleConfirmDelete}
        categoryName={deleteDialog.node?.name ?? ""}
        isPending={isPending}
        error={dialogError}
      />
    </div>
  );
}
