"use client";

/**
 * CouponsClient — управление купонами.
 * See task 25.7.
 */

import { Button, Input, cn } from "@timsan/ui";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";


import { createCouponAction, deleteCouponAction, updateCouponAction } from "@/lib/coupon-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

interface CouponsClientProps {
  initialCoupons: Coupon[];
}

// ─── Coupon dialog ────────────────────────────────────────────────────────────

interface CouponDialogProps {
  open: boolean;
  title: string;
  initial?: Coupon | undefined;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    usageLimit: number | null;
    expiresAt: string | null;
    isActive: boolean;
  }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

function CouponDialog({ open, title, initial, onClose, onSubmit, isPending, error }: CouponDialogProps) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [type, setType] = useState<"percent" | "fixed">(initial?.type ?? "percent");
  const [value, setValue] = useState(String(initial?.value ?? ""));
  const [usageLimit, setUsageLimit] = useState(initial?.usageLimit != null ? String(initial.usageLimit) : "");
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 16) : "",
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  React.useEffect(() => {
    if (open) {
      setCode(initial?.code ?? "");
      setType(initial?.type ?? "percent");
      setValue(String(initial?.value ?? ""));
      setUsageLimit(initial?.usageLimit != null ? String(initial.usageLimit) : "");
      setExpiresAt(initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 16) : "");
      setIsActive(initial?.isActive ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const valueLabel = type === "percent" ? "Скидка (%)" : "Скидка (₸)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({
              code: code.toUpperCase(),
              type,
              value: parseInt(value || "0", 10),
              usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
              expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
              isActive,
            });
          }}
          className="p-6 space-y-4"
        >
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Код купона <span className="text-red-500">*</span></label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER20"
              pattern="^[A-Z0-9_-]+$"
              title="Только заглавные буквы, цифры, _ и -"
              required
              disabled={isPending}
              className="font-mono uppercase"
            />
            <p className="mt-1 text-xs text-gray-500">Только заглавные буквы, цифры, _ и -</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Тип скидки</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "percent" | "fixed")}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фиксированная сумма (₸)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{valueLabel} <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min="1"
                max={type === "percent" ? "100" : undefined}
                step="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Лимит использований</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Без ограничений"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Действует до</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isPending} className="rounded" />
            <span className="text-sm text-gray-700">Активен</span>
          </label>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
            <Button type="submit" disabled={isPending || !code || !value}>
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

export function CouponsClient({ initialCoupons }: CouponsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);

  function refresh() { startTransition(() => router.refresh()); }

  async function handleCreate(data: Parameters<CouponDialogProps["onSubmit"]>[0]) {
    setDialogError(null);
    const result = await createCouponAction(data);
    if (result.error) { setDialogError(result.error); return; }
    setCreateOpen(false);
    refresh();
  }

  async function handleUpdate(data: Parameters<CouponDialogProps["onSubmit"]>[0]) {
    if (!editCoupon) return;
    setDialogError(null);
    const result = await updateCouponAction({ id: editCoupon.id, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setEditCoupon(null);
    refresh();
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Удалить купон «${coupon.code}»?`)) return;
    const result = await deleteCouponAction({ id: coupon.id });
    if (result.error) { alert(result.error); return; }
    refresh();
  }

  function formatValue(coupon: Coupon): string {
    if (coupon.type === "percent") return `${coupon.value}%`;
    return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(
      Math.floor(coupon.value / 100),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setDialogError(null); setCreateOpen(true); }} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Новый купон
        </Button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {initialCoupons.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Купонов нет.{" "}
            <button type="button" onClick={() => setCreateOpen(true)} className="text-blue-600 hover:underline">
              Создайте первый
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Код</th>
                  <th className="px-4 py-3">Скидка</th>
                  <th className="px-4 py-3 text-right">Использований</th>
                  <th className="px-4 py-3">Истекает</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm font-medium">{c.code}</code>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatValue(c)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {c.usageCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString("ru-KZ")
                        : <span className="text-gray-400">Бессрочно</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600",
                      )}>
                        {c.isActive ? "Активен" : "Отключён"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => { setDialogError(null); setEditCoupon(c); }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(c)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Удалить">
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

      <CouponDialog open={createOpen} title="Новый купон" onClose={() => setCreateOpen(false)} onSubmit={handleCreate} isPending={isPending} error={dialogError} />
      <CouponDialog open={!!editCoupon} title="Редактировать купон" initial={editCoupon ?? undefined} onClose={() => setEditCoupon(null)} onSubmit={handleUpdate} isPending={isPending} error={dialogError} />
    </div>
  );
}
