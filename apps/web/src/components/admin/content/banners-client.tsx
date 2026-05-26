"use client";

/**
 * BannersClient — управление баннерами главной страницы.
 * See task 25.6.
 */

import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useState, useTransition } from "react";

import { Button, Input, cn } from "@timsan/ui";

import { createBannerAction, deleteBannerAction, updateBannerAction } from "@/lib/banner-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Banner {
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

interface BannersClientProps {
  initialBanners: Banner[];
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadBannerImage(file: File): Promise<string> {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "banners" }),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Ошибка загрузки");
  }
  const { uploadUrl, publicUrl } = (await res.json()) as { uploadUrl: string; publicUrl: string };
  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("Ошибка загрузки файла в хранилище");
  return publicUrl;
}

// ─── Banner dialog ────────────────────────────────────────────────────────────

interface BannerDialogProps {
  open: boolean;
  title: string;
  initial?: Banner | undefined;
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

function BannerDialog({ open, title, initial, onClose, onSubmit, isPending, error }: BannerDialogProps) {
  const [bannerTitle, setBannerTitle] = useState(initial?.title ?? "");
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

  React.useEffect(() => {
    if (open) {
      setBannerTitle(initial?.title ?? "");
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
      const url = await uploadBannerImage(file);
      setImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
              title: bannerTitle,
              imageUrl,
              linkUrl,
              position: parseInt(position || "0", 10),
              isActive,
              startsAt: startsAt ? new Date(startsAt).toISOString() : null,
              endsAt: endsAt ? new Date(endsAt).toISOString() : null,
            });
          }}
          className="p-6 space-y-4"
        >
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Заголовок <span className="text-red-500">*</span></label>
            <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} required disabled={isPending || uploading} />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Изображение <span className="text-red-500">*</span></label>
            {imageUrl && (
              <div className="mb-2 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-24 w-40 rounded border object-cover" />
                <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-500 hover:underline">Удалить</button>
              </div>
            )}
            {uploadError && <p className="mb-1 text-xs text-red-600">{uploadError}</p>}
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} disabled={isPending || uploading} className="hidden" id="banner-image-input" />
              <label
                htmlFor="banner-image-input"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent",
                  (isPending || uploading) && "cursor-not-allowed opacity-50",
                )}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Загрузка..." : "Выбрать файл"}
              </label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Или вставьте URL..."
                disabled={isPending || uploading}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ссылка (URL)</label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." disabled={isPending || uploading} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Начало показа</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                disabled={isPending || uploading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Конец показа</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={isPending || uploading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Позиция</label>
              <Input type="number" min="0" step="1" value={position} onChange={(e) => setPosition(e.target.value)} disabled={isPending || uploading} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pt-5">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isPending || uploading} className="rounded" />
              <span className="text-sm text-gray-700">Активен</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending || uploading}>Отмена</Button>
            <Button type="submit" disabled={isPending || uploading || !bannerTitle || !imageUrl}>
              {(isPending || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
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
                        <button type="button" onClick={() => { setDialogError(null); setEditBanner(b); }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(b)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Удалить">
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

      <BannerDialog open={createOpen} title="Новый баннер" onClose={() => setCreateOpen(false)} onSubmit={handleCreate} isPending={isPending} error={dialogError} />
      <BannerDialog open={!!editBanner} title="Редактировать баннер" initial={editBanner ?? undefined} onClose={() => setEditBanner(null)} onSubmit={handleUpdate} isPending={isPending} error={dialogError} />
    </div>
  );
}
