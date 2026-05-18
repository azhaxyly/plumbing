"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

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
  /** Base path for the current page (e.g. "/category/bathtubs") */
  basePath: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert tiyins to KZT for display */
function tiyinsToKzt(tiyins: number): number {
  return Math.round(tiyins / 100);
}

/** Convert KZT input to tiyins */
function kztToTiyins(kzt: number): number {
  return Math.round(kzt * 100);
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
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (newFilters: FacetFilters) => {
      const qs = buildFacetUrl(newFilters);
      startTransition(() => {
        router.push(`${basePath}${qs}` as Route);
      });
    },
    [router, basePath],
  );

  // ── Brand toggle ────────────────────────────────────────────────────────────
  const handleBrandChange = (slug: string, checked: boolean) => {
    const current = currentFilters.brands ?? [];
    const next = checked
      ? [...current, slug]
      : current.filter((b) => b !== slug);
    const newFilters: FacetFilters = { ...currentFilters };
    if (next.length > 0) {
      newFilters.brands = next;
    } else {
      delete newFilters.brands;
    }
    navigate(newFilters);
  };

  // ── Price range ─────────────────────────────────────────────────────────────
  const currentPriceMin = currentFilters.price
    ? tiyinsToKzt(currentFilters.price.min)
    : tiyinsToKzt(priceRange.min);
  const currentPriceMax = currentFilters.price
    ? tiyinsToKzt(currentFilters.price.max)
    : tiyinsToKzt(priceRange.max);

  const handlePriceChange = (field: "min" | "max", kztValue: string) => {
    const parsed = parseInt(kztValue, 10);
    if (isNaN(parsed)) return;
    const tiyins = kztToTiyins(parsed);
    const current = currentFilters.price ?? {
      min: priceRange.min,
      max: priceRange.max,
    };
    navigate({
      ...currentFilters,
      price: {
        ...current,
        [field]: tiyins,
      },
    });
  };

  // ── Attribute toggle ────────────────────────────────────────────────────────
  const handleAttributeChange = (
    attrSlug: string,
    valueSlug: string,
    checked: boolean,
  ) => {
    const current = (currentFilters[attrSlug] as string[] | undefined) ?? [];
    const next = checked
      ? [...current, valueSlug]
      : current.filter((v) => v !== valueSlug);
    const newFilters: FacetFilters = { ...currentFilters };
    if (next.length > 0) {
      newFilters[attrSlug] = next;
    } else {
      delete newFilters[attrSlug];
    }
    navigate(newFilters);
  };

  // ── Reset all ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    startTransition(() => {
      router.push(basePath as Route);
    });
  };

  const hasActiveFilters =
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
      className={`space-y-6 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* Reset button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="w-full rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          Сбросить фильтры
        </button>
      )}

      {/* Price range */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Цена (₸)
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="price-min" className="sr-only">
              Минимальная цена
            </label>
            <input
              id="price-min"
              type="number"
              min={tiyinsToKzt(priceRange.min)}
              max={currentPriceMax}
              defaultValue={currentPriceMin}
              placeholder="От"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              onBlur={(e) => handlePriceChange("min", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePriceChange("min", (e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
          <span className="text-gray-400">—</span>
          <div className="flex-1">
            <label htmlFor="price-max" className="sr-only">
              Максимальная цена
            </label>
            <input
              id="price-max"
              type="number"
              min={currentPriceMin}
              max={tiyinsToKzt(priceRange.max)}
              defaultValue={currentPriceMax}
              placeholder="До"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              onBlur={(e) => handlePriceChange("max", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePriceChange("max", (e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* Brands */}
      {brands.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Бренд
          </h3>
          <ul className="space-y-2">
            {brands.map((brand) => {
              const checked = (currentFilters.brands ?? []).includes(brand.slug);
              return (
                <li key={brand.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        handleBrandChange(brand.slug, e.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                    />
                    {brand.name}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Attribute sections */}
      {attributes.map((attr) => {
        const selectedValues =
          (currentFilters[attr.slug] as string[] | undefined) ?? [];
        return (
          <section key={attr.id}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {attr.name}
            </h3>
            <ul className="space-y-2">
              {attr.values.map((val) => {
                const checked = selectedValues.includes(val.slug);
                return (
                  <li key={val.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          handleAttributeChange(
                            attr.slug,
                            val.slug,
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      {val.value}
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}
