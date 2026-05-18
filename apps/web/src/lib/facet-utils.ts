/**
 * Utilities for parsing and building facet filter URLs.
 */

export interface FacetFilters {
  brands?: string[];
  price?: { min: number; max: number };
  [attributeSlug: string]: string[] | { min: number; max: number } | undefined;
}

/**
 * Parses URL search params into a FacetFilters object.
 *
 * Conventions:
 *  - `brand` (repeatable) → brands[]
 *  - `price_min` / `price_max` (in KZT) → price.min / price.max (in tiyins)
 *  - any other repeatable param → attribute slug → string[]
 */
export function parseFacetFilters(searchParams: URLSearchParams): FacetFilters {
  const filters: FacetFilters = {};

  // Brands
  const brands = searchParams.getAll("brand");
  if (brands.length > 0) {
    filters.brands = brands;
  }

  // Price range (URL stores KZT, we convert to tiyins internally)
  const priceMinKzt = searchParams.get("price_min");
  const priceMaxKzt = searchParams.get("price_max");
  if (priceMinKzt !== null || priceMaxKzt !== null) {
    filters.price = {
      min: priceMinKzt !== null ? Math.round(parseFloat(priceMinKzt) * 100) : 0,
      max:
        priceMaxKzt !== null
          ? Math.round(parseFloat(priceMaxKzt) * 100)
          : Number.MAX_SAFE_INTEGER,
    };
  }

  // Attribute slugs (all other params)
  const reservedKeys = new Set(["brand", "price_min", "price_max"]);
  for (const [key, _value] of searchParams.entries()) {
    if (reservedKeys.has(key)) continue;
    const values = searchParams.getAll(key);
    if (values.length > 0) {
      filters[key] = values;
    }
  }

  return filters;
}

/**
 * Builds a URL query string from a FacetFilters object.
 * Price is stored in KZT (converted from tiyins).
 */
export function buildFacetUrl(filters: FacetFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;

    if (key === "brands" && Array.isArray(value)) {
      for (const brand of value) {
        params.append("brand", brand);
      }
    } else if (key === "price" && !Array.isArray(value)) {
      const priceFilter = value as { min: number; max: number };
      if (priceFilter.min > 0) {
        params.set("price_min", String(Math.round(priceFilter.min / 100)));
      }
      if (priceFilter.max < Number.MAX_SAFE_INTEGER) {
        params.set("price_max", String(Math.round(priceFilter.max / 100)));
      }
    } else if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v);
      }
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
