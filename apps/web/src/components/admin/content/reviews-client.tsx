"use client";

import { Button, Input, cn } from "@timsan/ui";
import { Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createReviewAction,
  deleteReviewAction,
  updateReviewAction,
} from "@/lib/review-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Rating picker ──────────────────────────────────────────────────────────────

function RatingPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className="p-0.5 disabled:cursor-not-allowed"
          aria-label={`${star} звёзд`}
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              star <= value ? "fill-amber-400 text-amber-400" : "text-gray-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface ReviewDialogProps {
  open: boolean;
  title: string;
  initial?: Review;
  onClose: () => void;
  onSubmit: (data: {
    authorName: string;
    rating: number;
    text: string;
    position: number;
    isActive: boolean;
  }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

function ReviewDialog({ open, title, initial, onClose, onSubmit, isPending, error }: ReviewDialogProps) {
  const [authorName, setAuthorName] = useState(initial?.authorName ?? "");
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [text, setText] = useState(initial?.text ?? "");
  const [position, setPosition] = useState(String(initial?.position ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  useEffect(() => {
    if (open) {
      setAuthorName(initial?.authorName ?? "");
      setRating(initial?.rating ?? 5);
      setText(initial?.text ?? "");
      setPosition(String(initial?.position ?? 0));
      setIsActive(initial?.isActive ?? true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

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
              authorName,
              rating,
              text,
              position: parseInt(position || "0", 10),
              isActive,
            });
          }}
          className="p-6 space-y-5"
        >
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {/* Author */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Имя автора <span className="text-red-500">*</span>
            </label>
            <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} required disabled={isPending} placeholder="Например: Денис Конев" />
          </div>

          {/* Rating */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Оценка</label>
            <RatingPicker value={rating} onChange={setRating} disabled={isPending} />
          </div>

          {/* Text */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Текст отзыва <span className="text-red-500">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              disabled={isPending}
              rows={4}
              placeholder="Текст отзыва клиента..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Position + Active */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Позиция (порядок)</label>
              <Input type="number" min="0" step="1" value={position} onChange={(e) => setPosition(e.target.value)} disabled={isPending} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pt-5">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isPending} className="rounded" />
              <span className="text-sm text-gray-700">Показывать на сайте</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
            <Button type="submit" disabled={isPending || !authorName || !text}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewsClient({ initialReviews }: { initialReviews: Review[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);

  function refresh() { startTransition(() => router.refresh()); }

  async function handleCreate(data: Parameters<ReviewDialogProps["onSubmit"]>[0]) {
    setDialogError(null);
    const result = await createReviewAction(data);
    if (result.error) { setDialogError(result.error); return; }
    setCreateOpen(false);
    refresh();
  }

  async function handleUpdate(data: Parameters<ReviewDialogProps["onSubmit"]>[0]) {
    if (!editReview) return;
    setDialogError(null);
    const result = await updateReviewAction({ id: editReview.id, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setEditReview(null);
    refresh();
  }

  async function handleDelete(review: Review) {
    if (!confirm(`Удалить отзыв «${review.authorName}»?`)) return;
    const result = await deleteReviewAction({ id: review.id });
    if (result.error) { alert(result.error); return; }
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setDialogError(null); setCreateOpen(true); }} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить отзыв
        </Button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {initialReviews.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Отзывов нет.{" "}
            <button type="button" onClick={() => setCreateOpen(true)} className="text-blue-600 hover:underline">
              Добавьте первый
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Автор</th>
                  <th className="px-4 py-3">Оценка</th>
                  <th className="px-4 py-3">Текст</th>
                  <th className="px-4 py-3 text-center">Поз.</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{review.authorName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-3.5 w-3.5",
                              star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300",
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[280px] truncate text-gray-600">{review.text}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{review.position}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        review.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600",
                      )}>
                        {review.isActive ? "Показан" : "Скрыт"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setDialogError(null); setEditReview(review); }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(review)}
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

      <ReviewDialog
        open={createOpen}
        title="Новый отзыв"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={isPending}
        error={dialogError}
      />
      <ReviewDialog
        open={!!editReview}
        title="Редактировать отзыв"
        {...(editReview ? { initial: editReview } : {})}
        onClose={() => setEditReview(null)}
        onSubmit={handleUpdate}
        isPending={isPending}
        error={dialogError}
      />
    </div>
  );
}
