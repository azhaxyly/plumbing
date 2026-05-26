"use client";

/**
 * PagesClient — CRUD CMS-страниц с Markdown-редактором.
 * See task 25.5.
 */

import { FileText, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";

import { Button, Input, cn } from "@timsan/ui";

import { createPageAction, deletePageAction, updatePageAction } from "@/lib/page-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PagesClientProps {
  initialPages: CmsPage[];
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

// ─── Page editor dialog ───────────────────────────────────────────────────────

interface PageDialogProps {
  open: boolean;
  title: string;
  initial?: CmsPage | undefined;
  onClose: () => void;
  onSubmit: (data: { slug: string; title: string; content: string; isPublished: boolean }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

function PageDialog({ open, title, initial, onClose, onSubmit, isPending, error }: PageDialogProps) {
  const [pageTitle, setPageTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initial);
  const [content, setContent] = useState(initial?.content ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  React.useEffect(() => {
    if (open) {
      setPageTitle(initial?.title ?? "");
      setSlug(initial?.slug ?? "");
      setSlugManual(!!initial);
      setContent(initial?.content ?? "");
      setIsPublished(initial?.isPublished ?? false);
      setTab("edit");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({ title: pageTitle, slug, content, isPublished });
          }}
          className="p-6 space-y-4"
        >
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Заголовок <span className="text-red-500">*</span></label>
              <Input
                value={pageTitle}
                onChange={(e) => {
                  setPageTitle(e.target.value);
                  if (!slugManual) setSlug(generateSlug(e.target.value));
                }}
                placeholder="О компании"
                required
                disabled={isPending}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug <span className="text-red-500">*</span></label>
              <Input
                value={slug}
                onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
                placeholder="about-us"
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                required
                disabled={isPending}
              />
            </div>
          </div>

          {/* Markdown editor */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Содержимое (Markdown)</label>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTab("edit")}
                  className={cn("px-2 py-0.5 rounded", tab === "edit" ? "bg-gray-200 font-medium" : "text-gray-500 hover:text-gray-700")}
                >
                  Редактор
                </button>
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  className={cn("px-2 py-0.5 rounded", tab === "preview" ? "bg-gray-200 font-medium" : "text-gray-500 hover:text-gray-700")}
                >
                  Предпросмотр
                </button>
              </div>
            </div>
            {tab === "edit" ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                disabled={isPending}
                placeholder="# Заголовок&#10;&#10;Текст страницы..."
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            ) : (
              <div
                className="min-h-[280px] rounded-md border bg-gray-50 px-4 py-3 text-sm prose prose-sm max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              disabled={isPending}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Опубликовать</span>
          </label>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
            <Button type="submit" disabled={isPending || !pageTitle || !slug}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Very minimal Markdown → HTML (bold, italic, headings, newlines)
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PagesClient({ initialPages }: PagesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPage, setEditPage] = useState<CmsPage | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleCreate(data: { slug: string; title: string; content: string; isPublished: boolean }) {
    setDialogError(null);
    const result = await createPageAction(data);
    if (result.error) { setDialogError(result.error); return; }
    setCreateOpen(false);
    refresh();
  }

  async function handleUpdate(data: { slug: string; title: string; content: string; isPublished: boolean }) {
    if (!editPage) return;
    setDialogError(null);
    const result = await updatePageAction({ id: editPage.id, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setEditPage(null);
    refresh();
  }

  async function handleDelete(page: CmsPage) {
    if (!confirm(`Удалить страницу «${page.title}»?`)) return;
    const result = await deletePageAction({ id: page.id });
    if (result.error) { alert(result.error); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setDialogError(null); setCreateOpen(true); }} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Новая страница
        </Button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {initialPages.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Страниц нет.{" "}
            <button type="button" onClick={() => setCreateOpen(true)} className="text-blue-600 hover:underline">
              Создайте первую
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Заголовок</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Обновлено</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialPages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="font-medium text-gray-900">{page.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">/{page.slug}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          page.isPublished
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700",
                        )}
                      >
                        {page.isPublished ? "Опубликована" : "Черновик"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(page.updatedAt).toLocaleDateString("ru-KZ", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setDialogError(null); setEditPage(page); }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(page)}
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Обновление...
          </div>
        )}
      </div>

      <PageDialog
        open={createOpen}
        title="Новая страница"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={isPending}
        error={dialogError}
      />
      <PageDialog
        open={!!editPage}
        title="Редактировать страницу"
        initial={editPage ?? undefined}
        onClose={() => setEditPage(null)}
        onSubmit={handleUpdate}
        isPending={isPending}
        error={dialogError}
      />
    </div>
  );
}
