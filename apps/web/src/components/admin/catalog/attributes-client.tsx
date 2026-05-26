"use client";

/**
 * AttributesClient — CRUD атрибутов и их значений.
 * See task 25.4.
 */

import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";

import { Button, Input } from "@timsan/ui";

import {
  createAttributeAction,
  createAttributeValueAction,
  deleteAttributeAction,
  deleteAttributeValueAction,
  updateAttributeAction,
  updateAttributeValueAction,
} from "@/lib/attribute-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttributeValue {
  id: string;
  value: string;
  slug: string;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
  values: AttributeValue[];
  _count: { products: number };
}

interface AttributesClientProps {
  initialAttributes: Attribute[];
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
    .slice(0, 100);
}

// ─── Attribute dialog ─────────────────────────────────────────────────────────

interface AttrDialogProps {
  open: boolean;
  title: string;
  initial?: { name: string; slug: string } | undefined;
  onClose: () => void;
  onSubmit: (data: { name: string; slug: string }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

function AttrDialog({ open, title, initial, onClose, onSubmit, isPending, error }: AttrDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initial);

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setSlug(initial?.slug ?? "");
      setSlugManual(!!initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({ name, slug });
          }}
          className="space-y-3"
        >
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Название <span className="text-red-500">*</span></label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugManual) setSlug(generateSlug(e.target.value));
              }}
              placeholder="Например: Цвет"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug <span className="text-red-500">*</span></label>
            <Input
              value={slug}
              onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              required
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Отмена</Button>
            <Button type="submit" size="sm" disabled={isPending || !name || !slug}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Value dialog ─────────────────────────────────────────────────────────────

interface ValueDialogProps {
  open: boolean;
  title: string;
  initial?: { value: string; slug: string } | undefined;
  onClose: () => void;
  onSubmit: (data: { value: string; slug: string }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

function ValueDialog({ open, title, initial, onClose, onSubmit, isPending, error }: ValueDialogProps) {
  const [value, setValue] = useState(initial?.value ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!initial);

  React.useEffect(() => {
    if (open) {
      setValue(initial?.value ?? "");
      setSlug(initial?.slug ?? "");
      setSlugManual(!!initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({ value, slug });
          }}
          className="space-y-3"
        >
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Значение <span className="text-red-500">*</span></label>
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (!slugManual) setSlug(generateSlug(e.target.value));
              }}
              placeholder="Например: Красный"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug <span className="text-red-500">*</span></label>
            <Input
              value={slug}
              onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              required
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Отмена</Button>
            <Button type="submit" size="sm" disabled={isPending || !value || !slug}>
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

export function AttributesClient({ initialAttributes }: AttributesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Attribute dialogs
  const [attrCreateOpen, setAttrCreateOpen] = useState(false);
  const [attrEdit, setAttrEdit] = useState<Attribute | null>(null);

  // Value dialogs
  const [valueCreate, setValueCreate] = useState<{ attributeId: string } | null>(null);
  const [valueEdit, setValueEdit] = useState<{ attr: Attribute; val: AttributeValue } | null>(null);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  // ── Attribute handlers ────────────────────────────────────────────────────────

  async function handleAttrCreate(data: { name: string; slug: string }) {
    setDialogError(null);
    const result = await createAttributeAction(data);
    if (result.error) { setDialogError(result.error); return; }
    setAttrCreateOpen(false);
    refresh();
  }

  async function handleAttrUpdate(data: { name: string; slug: string }) {
    if (!attrEdit) return;
    setDialogError(null);
    const result = await updateAttributeAction({ id: attrEdit.id, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setAttrEdit(null);
    refresh();
  }

  async function handleAttrDelete(attr: Attribute) {
    if (!confirm(`Удалить атрибут «${attr.name}» и все его значения?`)) return;
    const result = await deleteAttributeAction({ id: attr.id });
    if (result.error) { alert(result.error); return; }
    refresh();
  }

  // ── Value handlers ────────────────────────────────────────────────────────────

  async function handleValueCreate(data: { value: string; slug: string }) {
    if (!valueCreate) return;
    setDialogError(null);
    const result = await createAttributeValueAction({ attributeId: valueCreate.attributeId, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setValueCreate(null);
    refresh();
  }

  async function handleValueUpdate(data: { value: string; slug: string }) {
    if (!valueEdit) return;
    setDialogError(null);
    const result = await updateAttributeValueAction({ id: valueEdit.val.id, ...data });
    if (result.error) { setDialogError(result.error); return; }
    setValueEdit(null);
    refresh();
  }

  async function handleValueDelete(val: AttributeValue) {
    if (!confirm(`Удалить значение «${val.value}»?`)) return;
    const result = await deleteAttributeValueAction({ id: val.id });
    if (result.error) { alert(result.error); return; }
    refresh();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setDialogError(null); setAttrCreateOpen(true); }} disabled={isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить атрибут
        </Button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {initialAttributes.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Атрибутов нет.{" "}
            <button type="button" onClick={() => setAttrCreateOpen(true)} className="text-blue-600 hover:underline">
              Создайте первый
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {initialAttributes.map((attr) => {
              const isExpanded = expandedIds.has(attr.id);
              return (
                <div key={attr.id}>
                  {/* Attribute row */}
                  <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(attr.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">{attr.name}</span>
                      <code className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{attr.slug}</code>
                      <span className="ml-auto text-xs text-gray-400">
                        {attr.values.length} знач. · {attr._count.products} товаров
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDialogError(null); setAttrEdit(attr); }}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                      title="Редактировать атрибут"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttrDelete(attr)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      title="Удалить атрибут"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Values */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 px-8 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Значения</span>
                        <button
                          type="button"
                          onClick={() => { setDialogError(null); setValueCreate({ attributeId: attr.id }); }}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Plus className="h-3 w-3" />
                          Добавить
                        </button>
                      </div>
                      {attr.values.length === 0 ? (
                        <p className="text-xs text-gray-400">Значений нет</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((val) => (
                            <div
                              key={val.id}
                              className="group flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-sm"
                            >
                              <span>{val.value}</span>
                              <button
                                type="button"
                                onClick={() => { setDialogError(null); setValueEdit({ attr, val }); }}
                                className="text-gray-300 hover:text-blue-500"
                                title="Редактировать"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleValueDelete(val)}
                                className="text-gray-300 hover:text-red-500"
                                title="Удалить"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isPending && (
          <div className="flex items-center justify-center border-t px-4 py-2 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Обновление...
          </div>
        )}
      </div>

      <AttrDialog
        open={attrCreateOpen}
        title="Новый атрибут"
        onClose={() => setAttrCreateOpen(false)}
        onSubmit={handleAttrCreate}
        isPending={isPending}
        error={dialogError}
      />
      <AttrDialog
        open={!!attrEdit}
        title="Редактировать атрибут"
        initial={attrEdit ?? undefined}
        onClose={() => setAttrEdit(null)}
        onSubmit={handleAttrUpdate}
        isPending={isPending}
        error={dialogError}
      />
      <ValueDialog
        open={!!valueCreate}
        title="Новое значение"
        onClose={() => setValueCreate(null)}
        onSubmit={handleValueCreate}
        isPending={isPending}
        error={dialogError}
      />
      <ValueDialog
        open={!!valueEdit}
        title="Редактировать значение"
        initial={valueEdit?.val}
        onClose={() => setValueEdit(null)}
        onSubmit={handleValueUpdate}
        isPending={isPending}
        error={dialogError}
      />
    </div>
  );
}
