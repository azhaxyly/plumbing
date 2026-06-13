"use client";

import { Button, Input, cn } from "@timsan/ui";
import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  createPromoSlideAction,
  deletePromoSlideAction,
  updatePromoSlideAction,
} from "@/lib/promo-slide-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoSlide {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "promo-slides");
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Ошибка загрузки");
  }
  const { publicUrl } = (await res.json()) as { publicUrl: string };
  return publicUrl;
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface SlideDialogProps {
  open: boolean;
  title: string;
  initial?: PromoSlide;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    imageUrl: string;
    linkUrl: string;
    position: number;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

function SlideDialog({ open, title, initial, onClose, onSubmit, isPending, error }: SlideDialogProps) {
  const [slideTitle, setSlideTitle] = useState(initial?.title ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? "");
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

  useEffect(() => {
    if (open) {
      setSlideTitle(initial?.title ?? "");
      setImageUrl(initial?.imageUrl ?? "");
      setLinkUrl(initial?.linkUrl ?? "");
      setPosition(String(initial?.position ?? 0));
      setIsActive(initial?.isActive ?? true);
      setStartsAt(initial?.startsAt ? new Date(initial.startsAt).toISOString().slice(0, 16) : "");
      setEndsAt(initial?.endsAt ? new Date(initial.endsAt).toISOString().slice(0, 16) : "");
      setUploadError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Выберите файл изображения"); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Файл не должен превышать 10 МБ"); return; }
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
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
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
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
              title: slideTitle,
              imageUrl,
              linkUrl,
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
              Название <span className="text-red-500">*</span>
            </label>
            <Input value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} required disabled={busy} placeholder="Например: Летняя акция" />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Изображение (850 × 550) <span className="text-red-500">*</span>
            </label>
            {imageUrl && (
              <div className="mb-2 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-28 w-44 rounded border object-cover" />
                <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-500 hover:underline">Удалить</button>
              </div>
            )}
            {uploadError && <p className="mb-1 text-xs text-red-600">{uploadError}</p>}
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} disabled={busy} className="hidden" id="promo-slide-image-input" />
              <label
                htmlFor="promo-slide-image-input"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Ссылка при клике</label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/catalog или https://..." disabled={busy} />
          </div>

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
              <span className="text-sm text-gray-700">Активна</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Отмена</Button>
            <Button type="submit" disabled={busy || !slideTitle || !imageUrl}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PromoSlidesClient({ initialSlides }: { initialSlides: PromoSlide[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSlide, setEditSlide] = useState<PromoSlide | null>(null);

  function refresh() { startTransition(() => router.refresh()); }

  async function handleCreate(data: Parameters<SlideDialogProps["onSubmit"]>[0]) {
    setDialogError(null);
    const result = await createPromoSlideAction(data);
    if (result.error) { setDialogError(result.error); return; }
    setCreateOpen(false);
    refresh();
  }

  async function handleUpdate(data: Parameters<SlideDialogProps["onSubmit"]>[0]) {
    if (!editSlide) return;
    setDialogError(null);
    const result = await updatePromoSlideAction({ id: editSlide.id, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setEditSlide(null);
    refresh();
  }

  async function handleDelete(slide: PromoSlide) {
    if (!confirm(`Удалить афишу «${slide.title}»?`)) return;
    const result = await deletePromoSlideAction({ id: slide.id });
    if (result.error) { alert(result.error); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setDialogError(null); setCreateOpen(true); }} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить афишу
        </Button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {initialSlides.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Афиш нет.{" "}
            <button type="button" onClick={() => setCreateOpen(true)} className="text-blue-600 hover:underline">
              Добавьте первую
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Изображение</th>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3 text-center">Поз.</th>
                  <th className="px-4 py-3">Период показа</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialSlides.map((slide) => (
                  <tr key={slide.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {slide.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={slide.imageUrl} alt={slide.title} className="h-14 w-24 rounded border object-cover" />
                      ) : (
                        <div className="flex h-14 w-24 items-center justify-center rounded border bg-gray-100">
                          <ImageIcon className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{slide.title}</div>
                      {slide.linkUrl && <div className="mt-0.5 max-w-[200px] truncate text-xs text-blue-500">{slide.linkUrl}</div>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{slide.position}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {slide.startsAt || slide.endsAt ? (
                        <span>
                          {slide.startsAt ? new Date(slide.startsAt).toLocaleDateString("ru-KZ") : "—"}
                          {" → "}
                          {slide.endsAt ? new Date(slide.endsAt).toLocaleDateString("ru-KZ") : "∞"}
                        </span>
                      ) : (
                        <span className="text-gray-400">Всегда</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        slide.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600",
                      )}>
                        {slide.isActive ? "Активна" : "Отключена"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setDialogError(null); setEditSlide(slide); }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(slide)}
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

      <SlideDialog
        open={createOpen}
        title="Новая афиша"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={isPending}
        error={dialogError}
      />
      <SlideDialog
        open={!!editSlide}
        title="Редактировать афишу"
        {...(editSlide ? { initial: editSlide } : {})}
        onClose={() => setEditSlide(null)}
        onSubmit={handleUpdate}
        isPending={isPending}
        error={dialogError}
      />
    </div>
  );
}
