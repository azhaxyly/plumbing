"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useFilterTransition } from "@/contexts/filter-transition-context";
import type { FacetFilters } from "@/lib/facet-utils";
import { buildFacetUrl } from "@/lib/facet-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandFacetItem {
  id: string;
  slug: string;
  name: string;
}

export interface AttributeValueFacetItem {
  id: string;
  value: string;
  slug: string;
}

export interface AttributeFacetItem {
  id: string;
  name: string;
  slug: string;
  values: AttributeValueFacetItem[];
}

export interface PriceRange {
  min: number; // in tiyins
  max: number; // in tiyins
}

interface FacetPanelProps {
  brands: BrandFacetItem[];
  attributes: AttributeFacetItem[];
  priceRange: PriceRange;
  currentFilters: FacetFilters;
  basePath: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLLAPSED_VALUES_COUNT = 8;

function tiyinsToKzt(tiyins: number): number {
  return Math.round(tiyins / 100);
}

function kztToTiyins(kzt: number): number {
  return Math.round(kzt * 100);
}

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function FilterSection({
  title,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  badge?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
              {badge}
            </span>
          )}
        </span>
        <ChevronIcon open={isOpen} />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1">{children}</div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FacetPanel({
  brands,
  attributes,
  priceRange,
  currentFilters,
  basePath,
}: FacetPanelProps) {
  const router = useRouter();
  const { isPending, startFilterTransition: startTransition } = useFilterTransition();

  // ── Pending (not yet applied) filter state ──────────────────────────────────
  const [pendingFilters, setPendingFilters] = useState<FacetFilters>(() => currentFilters);

  // Local price inputs (KZT strings)
  const [priceMinInput, setPriceMinInput] = useState(() =>
    String(pendingFilters.price ? tiyinsToKzt(pendingFilters.price.min) : tiyinsToKzt(priceRange.min)),
  );
  const [priceMaxInput, setPriceMaxInput] = useState(() =>
    String(pendingFilters.price ? tiyinsToKzt(pendingFilters.price.max) : tiyinsToKzt(priceRange.max)),
  );

  // ── Open/closed sections (all closed by default) ────────────────────────────
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Expanded attribute values (collapsed list) ──────────────────────────────
  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set());

  const toggleAttrExpand = (slug: string) => {
    setExpandedAttrs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // ── Brand toggle ────────────────────────────────────────────────────────────
  const handleBrandChange = (slug: string, checked: boolean) => {
    const current = pendingFilters.brands ?? [];
    const next = checked ? [...current, slug] : current.filter((b) => b !== slug);
    setPendingFilters((f) => {
      const updated = { ...f };
      if (next.length > 0) updated.brands = next;
      else delete updated.brands;
      return updated;
    });
  };

  // ── Price inputs ─────────────────────────────────────────────────────────────
  const commitPrice = () => {
    const minKzt = parseInt(priceMinInput, 10);
    const maxKzt = parseInt(priceMaxInput, 10);
    if (isNaN(minKzt) || isNaN(maxKzt)) return;
    setPendingFilters((f) => ({
      ...f,
      price: { min: kztToTiyins(minKzt), max: kztToTiyins(maxKzt) },
    }));
  };

  // ── Attribute toggle ────────────────────────────────────────────────────────
  const handleAttributeChange = (attrSlug: string, valueSlug: string, checked: boolean) => {
    const current = (pendingFilters[attrSlug] as string[] | undefined) ?? [];
    const next = checked ? [...current, valueSlug] : current.filter((v) => v !== valueSlug);
    setPendingFilters((f) => {
      const updated = { ...f };
      if (next.length > 0) updated[attrSlug] = next;
      else delete updated[attrSlug];
      return updated;
    });
  };

  // ── Apply ───────────────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    const qs = buildFacetUrl(pendingFilters);
    startTransition(() => {
      router.push(`${basePath}${qs}` as Route);
    });
  }, [router, basePath, pendingFilters]);

  // ── Reset all ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPendingFilters({});
    setPriceMinInput(String(tiyinsToKzt(priceRange.min)));
    setPriceMaxInput(String(tiyinsToKzt(priceRange.max)));
    startTransition(() => {
      router.push(basePath as Route);
    });
  };

  // Count total pending selections for the Apply button badge
  const totalPendingCount =
    (pendingFilters.brands?.length ?? 0) +
    (pendingFilters.price !== undefined ? 1 : 0) +
    attributes.reduce((sum, attr) => {
      const vals = pendingFilters[attr.slug] as string[] | undefined;
      return sum + (vals?.length ?? 0);
    }, 0);

  const hasAppliedFilters =
    (currentFilters.brands?.length ?? 0) > 0 ||
    currentFilters.price !== undefined ||
    attributes.some(
      (attr) =>
        Array.isArray(currentFilters[attr.slug]) &&
        (currentFilters[attr.slug] as string[]).length > 0,
    );

  return (
    <aside
      aria-label="Фильтры"
      className={`rounded-xl border border-gray-200 bg-white overflow-hidden ${isPending ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* Price section */}
      <FilterSection
        title="Цена (₸)"
        badge={(pendingFilters.price !== undefined) ? 1 : 0}
        isOpen={openSections.has("price")}
        onToggle={() => toggleSection("price")}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceMinInput}
            min={tiyinsToKzt(priceRange.min)}
            max={tiyinsToKzt(priceRange.max)}
            placeholder="От"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            onChange={(e) => setPriceMinInput(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => e.key === "Enter" && commitPrice()}
          />
          <span className="shrink-0 text-gray-400">—</span>
          <input
            type="number"
            value={priceMaxInput}
            min={tiyinsToKzt(priceRange.min)}
            max={tiyinsToKzt(priceRange.max)}
            placeholder="До"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            onChange={(e) => setPriceMaxInput(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => e.key === "Enter" && commitPrice()}
          />
        </div>
      </FilterSection>

      {/* Brands section */}
      {brands.length > 0 && (
        <FilterSection
          title="Производитель"
          badge={pendingFilters.brands?.length ?? 0}
          isOpen={openSections.has("brands")}
          onToggle={() => toggleSection("brands")}
        >
          <ul className="space-y-2">
            {brands.map((brand) => {
              const checked = (pendingFilters.brands ?? []).includes(brand.slug);
              return (
                <li key={brand.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleBrandChange(brand.slug, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                    />
                    {brand.name}
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      )}

      {/* Attribute sections */}
      {attributes.map((attr) => {
        const selectedValues = (pendingFilters[attr.slug] as string[] | undefined) ?? [];
        const isOpen = openSections.has(attr.slug);
        const isExpanded = expandedAttrs.has(attr.slug);
        const hasMore = attr.values.length > COLLAPSED_VALUES_COUNT;
        const visibleValues = isExpanded ? attr.values : attr.values.slice(0, COLLAPSED_VALUES_COUNT);

        return (
          <FilterSection
            key={attr.id}
            title={attr.name}
            badge={selectedValues.length}
            isOpen={isOpen}
            onToggle={() => toggleSection(attr.slug)}
          >
            <ul className="space-y-2">
              {visibleValues.map((val) => {
                const checked = selectedValues.includes(val.slug);
                return (
                  <li key={val.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          handleAttributeChange(attr.slug, val.slug, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                      />
                      {val.value}
                    </label>
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <button
                type="button"
                onClick={() => toggleAttrExpand(attr.slug)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                {isExpanded
                  ? "Свернуть"
                  : `Показать ещё ${attr.values.length - COLLAPSED_VALUES_COUNT}`}
              </button>
            )}
          </FilterSection>
        );
      })}

      {/* Footer: Apply + Reset */}
      <div className="p-4 space-y-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          Применить
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {(hasAppliedFilters || totalPendingCount > 0) && (
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Сбросить фильтры
          </button>
        )}
      </div>
    </aside>
  );
}
