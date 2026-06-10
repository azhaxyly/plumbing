"use client";

import { Button, Input, cn } from "@timsan/ui";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";


import {
  addBannerProductAction,
  createBannerAction,
  deleteBannerAction,
  removeBannerProductAction,
  reorderBannerProductsAction,
  searchProductsForBannerAction,
  updateBannerAction,
} from "@/lib/banner-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type PosterPosition = "left" | "right" | "none" | "poster-only";

interface BannerProductItem {
  id: string;
  position: number;
  product: {
    id: string;
    name: string;
    priceCents: number;
    images: { url: string }[];
  };
}

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  backgroundColor: string;
  posterPosition: string;
  maxProducts: number;
  position: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  products: BannerProductItem[];
}

interface BannersClientProps {
  initialBanners: Banner[];
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadBannerImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "banners");
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Ошибка загрузки");
  }
  const { publicUrl } = (await res.json()) as { publicUrl: string };
  return publicUrl;
}

// ─── Layout picker ────────────────────────────────────────────────────────────

function LayoutPicker({
  value,
  onChange,
  disabled,
}: {
  value: PosterPosition;
  onChange: (v: PosterPosition) => void;
  disabled?: boolean;
}) {
  const options: { value: PosterPosition; label: string; preview: React.ReactNode }[] = [
    {
      value: "left",
      label: "Афиша слева",
      preview: (
        <div className="flex gap-0.5 h-8 w-full">
          <div className="flex-[0_0_38%] rounded bg-blue-200" />
          <div className="flex-1 grid grid-cols-2 gap-0.5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="rounded bg-gray-300" />)}
          </div>
        </div>
      ),
    },
    {
      value: "right",
      label: "Афиша справа",
      preview: (
        <div className="flex gap-0.5 h-8 w-full">
          <div className="flex-1 grid grid-cols-2 gap-0.5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="rounded bg-gray-300" />)}
          </div>
          <div className="flex-[0_0_38%] rounded bg-blue-200" />
        </div>
      ),
    },
    {
      value: "none",
      label: "Без афиши",
      preview: (
        <div className="flex gap-0.5 h-8 w-full">
          {[0, 1, 2, 3].map((i) => <div key={i} className="flex-1 rounded bg-gray-300" />)}
        </div>
      ),
    },
    {
      value: "poster-only",
      label: "Только афиша",
      preview: (
        <div className="flex gap-0.5 h-8 w-full">
          <div className="flex-1 rounded bg-blue-200" />
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg border-2 p-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
            value === opt.value
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300",
          )}
        >
          <div className="mb-1.5">{opt.preview}</div>
          <p className="text-xs font-medium text-gray-700">{opt.label}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Product search ────────────────────────────────────────────────────────────

interface SearchProduct {
  id: string;
  name: string;
  priceCents: number;
  slug: string;
  images: { url: string }[];
}

function ProductSearch({
  bannerId,
  existingIds,
  onAdded,
  disabled,
}: {
  bannerId: string;
  existingIds: Set<string>;
  onAdded: (product: { id: string; name: string; priceCents: number; images: { url: string }[] }) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    searchProductsForBannerAction({ q }).then((res) => {
      setResults(res.data ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  async function handleAdd(product: SearchProduct) {
    setAddingId(product.id);
    const res = await addBannerProductAction({ bannerId, productId: product.id });
    if (!res.error) {
      onAdded(product);
    }
    setAddingId(null);
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск товара по названию..."
          disabled={disabled}
          className="pl-8"
        />
      </div>
      {loading && (
        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Поиск...
        </div>
      )}
      {!loading && results.length > 0 && (
        <ul className="mt-2 max-h-52 overflow-y-auto divide-y rounded border bg-white">
          {results.map((p) => {
            const already = existingIds.has(p.id);
            return (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                {p.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt="" className="h-9 w-9 rounded border object-cover flex-shrink-0" />
                ) : (
                  <div className="h-9 w-9 flex-shrink-0 rounded border bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{(p.priceCents / 100).toLocaleString("ru-KZ")} ₸</p>
                </div>
                <button
                  type="button"
                  disabled={already || addingId === p.id || disabled}
                  onClick={() => handleAdd(p)}
                  className={cn(
                    "flex-shrink-0 rounded-full p-1 transition-colors",
                    already
                      ? "text-green-500 cursor-default"
                      : "text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  title={already ? "Уже добавлен" : "Добавить"}
                >
                  {addingId === p.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : already
                    ? <span className="text-xs">✓</span>
                    : <Plus className="h-4 w-4" />
                  }
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Ничего не найдено</p>
      )}
    </div>
  );
}

// ─── Products section (edit-only) ──────────────────────────────────────────────

function BannerProductsSection({
  bannerId,
  initialProducts,
  disabled,
}: {
  bannerId: string;
  initialProducts: BannerProductItem[];
  disabled?: boolean;
}) {
  const [products, setProducts] = useState<BannerProductItem[]>(
    [...initialProducts].sort((a, b) => a.position - b.position),
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const existingIds = new Set(products.map((p) => p.product.id));

  async function move(index: number, direction: "up" | "down") {
    const newProducts = [...products];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newProducts.length) return;
    [newProducts[index], newProducts[target]] = [newProducts[target]!, newProducts[index]!];
    setProducts(newProducts);
    await reorderBannerProductsAction({
      bannerId,
      productIds: newProducts.map((p) => p.product.id),
    });
  }

  async function remove(productId: string) {
    setRemovingId(productId);
    const res = await removeBannerProductAction({ bannerId, productId });
    if (!res.error) {
      setProducts((prev) => prev.filter((p) => p.product.id !== productId));
    }
    setRemovingId(null);
  }

  function handleAdded(product: { id: string; name: string; priceCents: number; images: { url: string }[] }) {
    const newItem: BannerProductItem = {
      id: `${bannerId}-${product.id}`,
      position: products.length,
      product,
    };
    setProducts((prev) => [...prev, newItem]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Товары в баннере</label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setShowSearch((v) => !v)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Добавить товар
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Товары не добавлены</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {products.map((bp, index) => (
            <li key={bp.product.id} className="flex items-center gap-2 px-3 py-2">
              {bp.product.images[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bp.product.images[0].url} alt="" className="h-10 w-10 rounded border object-cover flex-shrink-0" />
              ) : (
                <div className="h-10 w-10 flex-shrink-0 rounded border bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{bp.product.name}</p>
                <p className="text-xs text-gray-500">{(bp.product.priceCents / 100).toLocaleString("ru-KZ")} ₸</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => move(index, "up")}
                  disabled={index === 0 || disabled}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Вверх"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, "down")}
                  disabled={index === products.length - 1 || disabled}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Вниз"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(bp.product.id)}
                  disabled={removingId === bp.product.id || disabled}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Удалить"
                >
                  {removingId === bp.product.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <X className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showSearch && (
        <ProductSearch
          bannerId={bannerId}
          existingIds={existingIds}
          onAdded={handleAdded}
          {...(disabled ? { disabled: true } : {})}
        />
      )}
    </div>
  );
}

// ─── Banner dialog ────────────────────────────────────────────────────────────

interface BannerDialogProps {
  open: boolean;
  title: string;
  initial?: Banner;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    imageUrl: string;
    linkUrl: string;
    backgroundColor: string;
    posterPosition: PosterPosition;
    maxProducts: number;
    position: number;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

function BannerDialog({ open, title, initial, onClose, onSubmit, isPending, error }: BannerDialogProps) {
  const [bannerTitle, setBannerTitle] = useState(initial?.title ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? "");
  const [backgroundColor, setBackgroundColor] = useState(initial?.backgroundColor ?? "#f5f5f4");
  const [posterPosition, setPosterPosition] = useState<PosterPosition>(
    (initial?.posterPosition as PosterPosition) ?? "left",
  );
  const [maxProducts, setMaxProducts] = useState(initial?.maxProducts ?? 4);
  const [position, setPosition] = useState(String(initial?.position ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(
    initial?.startsAt ? new Date(initial.startsAt).toISOString().slice(0, 16) : "",
  );
  const [endsAt, setEndsAt] = useState(
    initial?.endsAt ? new Date(initial.endsAt).toISOString().slice(0, 16) : "",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setBannerTitle(initial?.title ?? "");
      setImageUrl(initial?.imageUrl ?? "");
      setLinkUrl(initial?.linkUrl ?? "");
      setBackgroundColor(initial?.backgroundColor ?? "#f5f5f4");
      setPosterPosition((initial?.posterPosition as PosterPosition) ?? "left");
      setMaxProducts(initial?.maxProducts ?? 4);
      setPosition(String(initial?.position ?? 0));
      setIsActive(initial?.isActive ?? true);
      setStartsAt(initial?.startsAt ? new Date(initial.startsAt).toISOString().slice(0, 16) : "");
      setEndsAt(initial?.endsAt ? new Date(initial.endsAt).toISOString().slice(0, 16) : "");
      setUploadError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const maxProductOptions = posterPosition === "poster-only" ? [] : posterPosition === "none" ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Выберите файл изображения"); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Файл не должен превышать 10 МБ"); return; }
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = isPending || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({
              title: bannerTitle,
              imageUrl,
              linkUrl,
              backgroundColor,
              posterPosition,
              maxProducts,
              position: parseInt(position || "0", 10),
              isActive,
              startsAt: startsAt ? new Date(startsAt).toISOString() : null,
              endsAt: endsAt ? new Date(endsAt).toISOString() : null,
            });
          }}
          className="p-6 space-y-5"
        >
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Заголовок <span className="text-red-500">*</span>
            </label>
            <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} required disabled={busy} />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Изображение (афиша) {posterPosition !== "none" && <span className="text-red-500">*</span>}
            </label>
            {imageUrl && (
              <div className="mb-2 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-24 w-40 rounded border object-cover" />
                <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-500 hover:underline">Удалить</button>
              </div>
            )}
            {uploadError && <p className="mb-1 text-xs text-red-600">{uploadError}</p>}
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} disabled={busy} className="hidden" id="banner-image-input" />
              <label
                htmlFor="banner-image-input"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent",
                  busy && "cursor-not-allowed opacity-50",
                )}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Загрузка..." : "Выбрать файл"}
              </label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Или вставьте URL..."
                disabled={busy}
                className="flex-1"
              />
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ссылка афиши (URL)</label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." disabled={busy} />
          </div>

          {/* Background color */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Цвет фона баннера</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                disabled={busy}
                className="h-9 w-14 cursor-pointer rounded border border-input p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#f5f5f4"
                disabled={busy}
                className="w-32 font-mono text-sm"
              />
              <div
                className="flex h-9 flex-1 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-500"
                style={{ backgroundColor }}
              >
                Предпросмотр
              </div>
            </div>
          </div>

          {/* Layout picker */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Расположение афиши</label>
            <LayoutPicker value={posterPosition} onChange={setPosterPosition} disabled={busy} />
          </div>

          {/* Max products — hidden for poster-only */}
          {posterPosition !== "poster-only" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Количество товаров
              </label>
              <div className="flex gap-1.5">
                {maxProductOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => setMaxProducts(n)}
                    className={cn(
                      "h-8 w-8 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      maxProducts === n
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Начало показа</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                disabled={busy}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Конец показа</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={busy}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Position + Active */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Позиция (порядок)</label>
              <Input type="number" min="0" step="1" value={position} onChange={(e) => setPosition(e.target.value)} disabled={busy} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pt-5">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={busy} className="rounded" />
              <span className="text-sm text-gray-700">Активен</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Отмена</Button>
            <Button
              type="submit"
              disabled={busy || !bannerTitle || (posterPosition !== "none" && !imageUrl)}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>

        {/* Products section — only when editing */}
        {initial && (
          <div className="border-t px-6 pb-6 pt-5">
            <BannerProductsSection
              bannerId={initial.id}
              initialProducts={initial.products}
              disabled={isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Poster position badge ────────────────────────────────────────────────────

function PosterBadge({ position }: { position: string }) {
  const map: Record<string, string> = { left: "◧ Слева", right: "◨ Справа", none: "▦ Без афиши", "poster-only": "⬛ Только афиша" };
  return <span className="text-xs text-gray-500">{map[position] ?? position}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BannersClient({ initialBanners }: BannersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);

  function refresh() { startTransition(() => router.refresh()); }

  async function handleCreate(data: Parameters<BannerDialogProps["onSubmit"]>[0]) {
    setDialogError(null);
    const result = await createBannerAction(data);
    if (result.error) { setDialogError(result.error); return; }
    setCreateOpen(false);
    refresh();
  }

  async function handleUpdate(data: Parameters<BannerDialogProps["onSubmit"]>[0]) {
    if (!editBanner) return;
    setDialogError(null);
    const result = await updateBannerAction({ id: editBanner.id, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setEditBanner(null);
    refresh();
  }

  async function handleDelete(banner: Banner) {
    if (!confirm(`Удалить баннер «${banner.title}»?`)) return;
    const result = await deleteBannerAction({ id: banner.id });
    if (result.error) { alert(result.error); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setDialogError(null); setCreateOpen(true); }} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить баннер
        </Button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {initialBanners.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Баннеров нет.{" "}
            <button type="button" onClick={() => setCreateOpen(true)} className="text-blue-600 hover:underline">
              Добавьте первый
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Изображение</th>
                  <th className="px-4 py-3">Заголовок</th>
                  <th className="px-4 py-3">Макет</th>
                  <th className="px-4 py-3 text-center">Поз.</th>
                  <th className="px-4 py-3">Период показа</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialBanners.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {b.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.imageUrl} alt={b.title} className="h-12 w-20 rounded border object-cover" />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded border bg-gray-100">
                          <ImageIcon className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.title}</div>
                      {b.linkUrl && <div className="mt-0.5 truncate text-xs text-blue-500">{b.linkUrl}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <PosterBadge position={b.posterPosition} />
                      <div className="mt-0.5 text-xs text-gray-400">
                        {b.products.length} / {b.maxProducts} товаров
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{b.position}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {b.startsAt || b.endsAt ? (
                        <span>
                          {b.startsAt ? new Date(b.startsAt).toLocaleDateString("ru-KZ") : "—"}
                          {" → "}
                          {b.endsAt ? new Date(b.endsAt).toLocaleDateString("ru-KZ") : "∞"}
                        </span>
                      ) : (
                        <span className="text-gray-400">Всегда</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        b.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600",
                      )}>
                        {b.isActive ? "Активен" : "Отключён"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setDialogError(null); setEditBanner(b); }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
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
        {isPending && (
          <div className="flex items-center justify-center border-t px-4 py-2 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Обновление...
          </div>
        )}
      </div>

      <BannerDialog
        open={createOpen}
        title="Новый баннер"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={isPending}
        error={dialogError}
      />
      <BannerDialog
        open={!!editBanner}
        title="Редактировать баннер"
        {...(editBanner ? { initial: editBanner } : {})}
        onClose={() => setEditBanner(null)}
        onSubmit={handleUpdate}
        isPending={isPending}
        error={dialogError}
      />
    </div>
  );
}
