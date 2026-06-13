"use client";

/**
 * ProductForm — полная форма создания/редактирования товара.
 *
 * Вкладки: Основное | Варианты | Изображения | Атрибуты | SEO
 * Режимы: "create" (нет product) | "edit" (product передан)
 * See task 25.3.
 */

import { Button, Input, cn } from "@timsan/ui";
import { Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useState, useTransition } from "react";


import {
  createProductAction,
  deleteImageAction,
  deleteVariantAction,
  setCategoriesAction,
  setAttributesAction,
  updateProductAction,
  upsertImageAction,
  upsertVariantAction,
} from "@/lib/product-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  sku: string;
  priceCents: number;
  quantity: number;
  // Prisma JsonValue — not constrained further
  attributes: unknown;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string;
  position: number;
  isPrimary: boolean;
}

interface ProductAttribute {
  id: string;
  attributeId: string;
  attributeValueId: string;
  attribute: { id: string; name: string; slug: string };
  attributeValue: { id: string; value: string; slug: string };
}

interface ProductCategory {
  categoryId: string;
  category: { id: string; name: string; slug: string };
}

interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brandId: string;
  status: "active" | "draft" | "archived";
  priceCents: number;
  compareAtPriceCents: number | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  variants: Variant[];
  images: ProductImage[];
  categories: ProductCategory[];
  productAttributes: ProductAttribute[];
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

interface AttributeOption {
  id: string;
  name: string;
  slug: string;
  values: { id: string; value: string; slug: string }[];
}

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  brands: BrandOption[];
  categories: CategoryNode[];
  attributes: AttributeOption[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
  ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => CYRILLIC_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
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

async function uploadImage(file: File, folder = "products") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Ошибка загрузки");
  }
  const { publicUrl } = (await res.json()) as { publicUrl: string };
  return { publicUrl };
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "general", label: "Основное" },
  { id: "variants", label: "Варианты" },
  { id: "images", label: "Изображения" },
  { id: "attributes", label: "Атрибуты" },
  { id: "seo", label: "SEO" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Variant dialog ───────────────────────────────────────────────────────────

interface VariantDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { sku: string; priceCents: number; quantity: number }) => Promise<void>;
  initial?: Variant | undefined;
  isPending: boolean;
  error: string | null;
}

function VariantDialog({ open, onClose, onSubmit, initial, isPending, error }: VariantDialogProps) {
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [price, setPrice] = useState(initial ? String(Math.floor(initial.priceCents / 100)) : "");
  const [qty, setQty] = useState(initial ? String(initial.quantity) : "0");

  React.useEffect(() => {
    if (open) {
      setSku(initial?.sku ?? "");
      setPrice(initial ? String(Math.floor(initial.priceCents / 100)) : "");
      setQty(initial ? String(initial.quantity) : "0");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      sku,
      priceCents: Math.round(parseFloat(price || "0") * 100),
      quantity: parseInt(qty || "0", 10),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{initial ? "Редактировать вариант" : "Добавить вариант"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SKU <span className="text-red-500">*</span></label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU варианта" required disabled={isPending} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Цена (₸) <span className="text-red-500">*</span></label>
            <Input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" required disabled={isPending} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Количество</label>
            <Input type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Отмена</Button>
            <Button type="submit" size="sm" disabled={isPending || !sku || !price}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductForm({ mode, product, brands, categories, attributes }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [formError, setFormError] = useState<string | null>(null);

  // ── General fields ───────────────────────────────────────────────────────────
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!product);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [brandId, setBrandId] = useState(product?.brandId ?? (brands[0]?.id ?? ""));
  const [status, setStatus] = useState<"active" | "draft" | "archived">(product?.status ?? "draft");
  const [priceCents, setPriceCents] = useState(product ? String(Math.floor(product.priceCents / 100)) : "");
  const [comparePrice, setComparePrice] = useState(
    product?.compareAtPriceCents ? String(Math.floor(product.compareAtPriceCents / 100)) : "",
  );
  const [shortDesc, setShortDesc] = useState(product?.shortDescription ?? "");
  const [description, setDescription] = useState(product?.description ?? "");

  // ── Categories ────────────────────────────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    product?.categories.map((c) => c.categoryId) ?? [],
  );
  const [catSearch, setCatSearch] = useState("");
  const [catOnlyAssigned, setCatOnlyAssigned] = useState(false);

  // ── Variants ─────────────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [variantDialog, setVariantDialog] = useState<{ open: boolean; variant?: Variant }>({ open: false });
  const [variantError, setVariantError] = useState<string | null>(null);

  // ── Images ───────────────────────────────────────────────────────────────────
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Attributes ────────────────────────────────────────────────────────────────
  const [productAttrs, setProductAttrs] = useState<
    { attributeId: string; attributeValueId: string }[]
  >(
    product?.productAttributes.map((a) => ({
      attributeId: a.attributeId,
      attributeValueId: a.attributeValueId,
    })) ?? [],
  );
  const [attrSearch, setAttrSearch] = useState("");
  const [attrOnlyAssigned, setAttrOnlyAssigned] = useState(false);

  // ── SEO ───────────────────────────────────────────────────────────────────────
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "");
  const [seoKeywords, setSeoKeywords] = useState(product?.seoKeywords ?? "");

  const flatCategories = flattenCategories(categories);

  // ── Handlers — General ───────────────────────────────────────────────────────

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) setSlug(generateSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value);
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  // ── Submit — General tab (save product) ──────────────────────────────────────

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const priceVal = Math.round(parseFloat(priceCents || "0") * 100);
    const comparePriceVal = comparePrice
      ? Math.round(parseFloat(comparePrice) * 100)
      : null;

    if (mode === "create") {
      const result = await createProductAction({
        name,
        slug,
        sku,
        brandId,
        status,
        priceCents: priceVal,
        ...(comparePriceVal !== null ? { compareAtPriceCents: comparePriceVal } : {}),
        ...(shortDesc ? { shortDescription: shortDesc } : {}),
        ...(description ? { description } : {}),
        ...(seoTitle ? { seoTitle } : {}),
        ...(seoDescription ? { seoDescription } : {}),
        ...(seoKeywords ? { seoKeywords } : {}),
      });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.data) {
        // Set categories after creation
        if (selectedCategories.length > 0) {
          await setCategoriesAction({ productId: result.data.id, categoryIds: selectedCategories });
        }
        const productId = result.data.id;
        startTransition(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.push(`/admin/catalog/products/${productId}/edit` as any);
        });
      }
    } else if (product) {
      const result = await updateProductAction({
        id: product.id,
        name,
        slug,
        sku,
        brandId,
        status,
        priceCents: priceVal,
        compareAtPriceCents: comparePriceVal,
        shortDescription: shortDesc || null,
        description: description || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null,
      });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      // Save categories
      await setCategoriesAction({ productId: product.id, categoryIds: selectedCategories });
      startTransition(() => router.refresh());
    }
  }

  // ── Handlers — Variants ──────────────────────────────────────────────────────

  async function handleVariantSave(data: { sku: string; priceCents: number; quantity: number }) {
    if (!product) return;
    setVariantError(null);
    const result = await upsertVariantAction({
      productId: product.id,
      ...(variantDialog.variant?.id ? { id: variantDialog.variant.id } : {}),
      ...data,
    });
    if (result.error) {
      setVariantError(result.error);
      return;
    }
    setVariantDialog({ open: false });
    startTransition(() => router.refresh());
    // Optimistic update
    if (variantDialog.variant) {
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variantDialog.variant!.id
            ? { ...v, sku: data.sku, priceCents: data.priceCents, quantity: data.quantity }
            : v,
        ),
      );
    }
  }

  async function handleVariantDelete(variantId: string) {
    if (!product || !confirm("Удалить вариант?")) return;
    const result = await deleteVariantAction({ variantId });
    if (result.error) {
      alert(result.error);
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
    startTransition(() => router.refresh());
  }

  // ── Handlers — Images ─────────────────────────────────────────────────────────

  async function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!product) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploadError(null);
    setUploading(true);

    const added: ProductImage[] = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) {
          setUploadError("Максимальный размер файла 10 МБ");
          continue;
        }
        const { publicUrl } = await uploadImage(file);
        const position = images.length + added.length;
        const isFirst = position === 0;
        const alt = file.name.replace(/\.[^.]+$/, "");
        const result = await upsertImageAction({
          productId: product.id,
          url: publicUrl,
          alt,
          position,
          isPrimary: isFirst,
        });
        if (result.error || !result.data) {
          setUploadError(result.error ?? "Ошибка загрузки");
          break;
        }
        added.push({ id: result.data.id, url: publicUrl, alt, position, isPrimary: isFirst });
      }
      // Optimistic update so new images appear without a page reload
      if (added.length) setImages((prev) => [...prev, ...added]);
      startTransition(() => router.refresh());
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleSetPrimary(imageId: string) {
    if (!product) return;
    const img = images.find((i) => i.id === imageId);
    if (!img) return;
    const result = await upsertImageAction({
      productId: product.id,
      id: imageId,
      url: img.url,
      alt: img.alt,
      position: img.position,
      isPrimary: true,
    });
    if (result.error) {
      alert(result.error);
      return;
    }
    setImages((prev) =>
      prev.map((i) => ({ ...i, isPrimary: i.id === imageId })),
    );
    startTransition(() => router.refresh());
  }

  async function handleImageDelete(imageId: string) {
    if (!product || !confirm("Удалить изображение?")) return;
    const result = await deleteImageAction({ imageId });
    if (result.error) {
      alert(result.error);
      return;
    }
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    startTransition(() => router.refresh());
  }

  // ── Handlers — Attributes ─────────────────────────────────────────────────────

  async function handleSaveAttributes() {
    if (!product) return;
    const result = await setAttributesAction({ productId: product.id, attributes: productAttrs });
    if (result.error) {
      alert(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  function setAttrValue(attributeId: string, attributeValueId: string) {
    setProductAttrs((prev) => {
      const without = prev.filter((a) => a.attributeId !== attributeId);
      if (!attributeValueId) return without;
      return [...without, { attributeId, attributeValueId }];
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── General tab ── */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Основная информация</h2>
            <div className="grid gap-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Название <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Название товара"
                  required
                  disabled={isPending}
                />
              </div>

              {/* Slug + SKU */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="product-slug"
                    required
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="ART-001"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Brand + Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Бренд <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    required
                    disabled={isPending}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Статус</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    disabled={isPending}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="draft">Черновик</option>
                    <option value="active">Активен</option>
                    <option value="archived">Архив</option>
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Цена (₸) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={priceCents}
                    onChange={(e) => setPriceCents(e.target.value)}
                    placeholder="0"
                    required
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Цена до скидки (₸)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    placeholder="0"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Short description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Краткое описание</label>
                <textarea
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  rows={2}
                  disabled={isPending}
                  placeholder="Краткое описание для листинга..."
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Full description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  disabled={isPending}
                  placeholder="Полное описание товара..."
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          {(() => {
            const query = catSearch.trim().toLowerCase();
            const visibleCategories = flatCategories.filter((c) => {
              if (catOnlyAssigned && !selectedCategories.includes(c.id)) return false;
              if (query && !c.name.toLowerCase().includes(query)) return false;
              return true;
            });
            const selectedNames = flatCategories.filter((c) =>
              selectedCategories.includes(c.id),
            );
            return (
              <div className="rounded-lg border bg-white shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-semibold text-gray-800">Категории</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      выбрано {selectedCategories.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Input
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        placeholder="Поиск категории…"
                        className="pr-7"
                        disabled={isPending}
                      />
                      {catSearch && (
                        <button
                          type="button"
                          onClick={() => setCatSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          title="Очистить"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCatOnlyAssigned((v) => !v)}
                      className={cn(
                        "whitespace-nowrap rounded-md border px-3 py-2 text-sm transition-colors",
                        catOnlyAssigned
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-input bg-background text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      Только выбранные
                    </button>
                  </div>
                </div>

                {/* Selected chips */}
                {selectedNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-b p-3">
                    {selectedNames.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-xs font-medium text-blue-700"
                      >
                        {c.name}
                        <button
                          type="button"
                          onClick={() => toggleCategory(c.id)}
                          disabled={isPending}
                          className="rounded-full p-0.5 hover:bg-blue-100"
                          title="Убрать"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* List */}
                <div className="max-h-80 overflow-y-auto p-2">
                  {visibleCategories.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-gray-400">
                      {flatCategories.length === 0
                        ? "Категории не найдены"
                        : catOnlyAssigned
                          ? "Нет выбранных категорий"
                          : "Ничего не найдено"}
                    </p>
                  ) : (
                    visibleCategories.map((c) => {
                      const checked = selectedCategories.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                            checked ? "bg-blue-50/60" : "hover:bg-gray-50",
                          )}
                          style={{ paddingLeft: `${8 + (query ? 0 : c.depth * 16)}px` }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(c.id)}
                            disabled={isPending}
                            className="rounded"
                          />
                          <span className={cn("text-gray-700", checked && "font-medium text-blue-700")}>
                            {c.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || !name || !slug || !sku || !priceCents}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Создать товар" : "Сохранить"}
            </Button>
          </div>
        </form>
      )}

      {/* ── Variants tab ── */}
      {activeTab === "variants" && (
        <div className="space-y-4">
          {!product && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              Сначала создайте товар во вкладке «Основное», затем добавляйте варианты.
            </div>
          )}

          {product && (
            <>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setVariantError(null);
                    setVariantDialog({ open: true });
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Добавить вариант
                </Button>
              </div>

              <div className="rounded-lg border bg-white shadow-sm">
                {variants.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Вариантов нет. Нажмите «Добавить вариант».
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-3">SKU</th>
                          <th className="px-4 py-3 text-right">Цена</th>
                          <th className="px-4 py-3 text-right">Кол-во</th>
                          <th className="px-4 py-3 text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variants.map((v) => (
                          <tr key={v.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{v.sku}</code>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{formatPrice(v.priceCents)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{v.quantity}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVariantError(null);
                                    setVariantDialog({ open: true, variant: v });
                                  }}
                                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                                  title="Редактировать"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleVariantDelete(v.id)}
                                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
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
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Images tab ── */}
      {activeTab === "images" && (
        <div className="space-y-4">
          {!product && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              Сначала создайте товар во вкладке «Основное», затем добавляйте изображения.
            </div>
          )}

          {product && (
            <>
              {uploadError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{uploadError}</div>
              )}

              <div className="flex items-center gap-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFiles}
                  disabled={uploading}
                  className="hidden"
                  id="product-images-input"
                />
                <label
                  htmlFor="product-images-input"
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                    uploading && "cursor-not-allowed opacity-50",
                  )}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Загрузка..." : "Загрузить изображения"}
                </label>
                <span className="text-xs text-gray-500">PNG, JPG, WebP до 10 МБ</span>
              </div>

              {images.length === 0 ? (
                <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-500">
                  Изображений нет. Загрузите файлы выше.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-lg border bg-gray-50",
                        img.isPrimary && "ring-2 ring-blue-500",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex flex-col items-end justify-between bg-black/0 p-1.5 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleImageDelete(img.id)}
                          className="rounded bg-white/90 p-1 text-red-600 hover:bg-red-50"
                          title="Удалить"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(img.id)}
                            className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-gray-700 hover:bg-white"
                          >
                            Главное
                          </button>
                        )}
                      </div>
                      {img.isPrimary && (
                        <div className="absolute left-1 top-1 rounded bg-blue-500 px-1 py-0.5 text-xs text-white">
                          Главное
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Attributes tab ── */}
      {activeTab === "attributes" && (
        <div className="space-y-4">
          {!product && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              Сначала создайте товар во вкладке «Основное», затем настраивайте атрибуты.
            </div>
          )}

          {product && (
            <>
              {attributes.length === 0 ? (
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Атрибуты не найдены.{" "}
                    <a href="/admin/catalog/attributes" className="text-blue-600 hover:underline">
                      Создайте атрибуты
                    </a>{" "}
                    в разделе каталога.
                  </p>
                </div>
              ) : (
                (() => {
                  const assignedCount = productAttrs.filter((a) => a.attributeValueId).length;
                  const query = attrSearch.trim().toLowerCase();
                  const visible = attributes.filter((attr) => {
                    const isAssigned = productAttrs.some(
                      (a) => a.attributeId === attr.id && a.attributeValueId,
                    );
                    if (attrOnlyAssigned && !isAssigned) return false;
                    if (query && !attr.name.toLowerCase().includes(query)) return false;
                    return true;
                  });
                  return (
                    <div className="rounded-lg border bg-white shadow-sm">
                      {/* Toolbar */}
                      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-semibold text-gray-800">Атрибуты товара</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            заполнено {assignedCount} из {attributes.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 sm:w-64">
                            <Input
                              value={attrSearch}
                              onChange={(e) => setAttrSearch(e.target.value)}
                              placeholder="Поиск атрибута…"
                              className="pr-7"
                            />
                            {attrSearch && (
                              <button
                                type="button"
                                onClick={() => setAttrSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                title="Очистить"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttrOnlyAssigned((v) => !v)}
                            className={cn(
                              "whitespace-nowrap rounded-md border px-3 py-2 text-sm transition-colors",
                              attrOnlyAssigned
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-input bg-background text-gray-600 hover:bg-gray-50",
                            )}
                          >
                            Только заполненные
                          </button>
                        </div>
                      </div>

                      {/* List */}
                      <div className="max-h-[28rem] divide-y overflow-y-auto">
                        {visible.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm text-gray-400">
                            {attrOnlyAssigned
                              ? "Нет заполненных атрибутов."
                              : "Ничего не найдено."}
                          </p>
                        ) : (
                          visible.map((attr) => {
                            const current = productAttrs.find((a) => a.attributeId === attr.id);
                            const isAssigned = !!current?.attributeValueId;
                            return (
                              <div
                                key={attr.id}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5",
                                  isAssigned ? "bg-blue-50/40" : "hover:bg-gray-50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    isAssigned ? "bg-blue-500" : "bg-gray-200",
                                  )}
                                />
                                <label
                                  className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700"
                                  title={attr.name}
                                >
                                  {attr.name}
                                </label>
                                <select
                                  value={current?.attributeValueId ?? ""}
                                  onChange={(e) => setAttrValue(attr.id, e.target.value)}
                                  className={cn(
                                    "w-44 shrink-0 rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-56",
                                    isAssigned ? "border-blue-300" : "border-input text-gray-500",
                                  )}
                                >
                                  <option value="">— не выбрано —</option>
                                  {attr.values.map((v) => (
                                    <option key={v.id} value={v.id}>{v.value}</option>
                                  ))}
                                </select>
                                {isAssigned && (
                                  <button
                                    type="button"
                                    onClick={() => setAttrValue(attr.id, "")}
                                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                                    title="Очистить значение"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveAttributes} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сохранить атрибуты
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SEO tab ── */}
      {activeTab === "seo" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!product) return;
            setFormError(null);
            const result = await updateProductAction({
              id: product.id,
              seoTitle: seoTitle || null,
              seoDescription: seoDescription || null,
              seoKeywords: seoKeywords || null,
            });
            if (result.error) {
              setFormError(result.error);
              return;
            }
            startTransition(() => router.refresh());
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          {!product && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              Сначала создайте товар во вкладке «Основное».
            </div>
          )}

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">SEO-настройки</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">SEO-заголовок</label>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Оставьте пустым для автогенерации"
                  maxLength={255}
                  disabled={!product || isPending}
                />
                <p className="mt-1 text-xs text-gray-500">{seoTitle.length}/255</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">SEO-описание</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Оставьте пустым для автогенерации"
                  disabled={!product || isPending}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500">{seoDescription.length}/500</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ключевые слова</label>
                <Input
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="Через запятую"
                  maxLength={500}
                  disabled={!product || isPending}
                />
              </div>
            </div>
          </div>

          {product && (
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить SEO
              </Button>
            </div>
          )}
        </form>
      )}

      {/* Variant dialog */}
      <VariantDialog
        open={variantDialog.open}
        onClose={() => setVariantDialog({ open: false })}
        onSubmit={handleVariantSave}
        initial={variantDialog.variant}
        isPending={isPending}
        error={variantError}
      />
    </div>
  );
}
