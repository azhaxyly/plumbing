import type { FacetData } from "./facet-cache";

// ─── Global value filters ──────────────────────────────────────────────────────
// Applied to these attribute slugs in ALL categories

const ALLOWED_COLOR_SLUGS = new Set([
  "белый",
  "хром",
  "сатин",
  "бронзовый",
  "золотой",
  "графит",
  "стальной",
  "черный",
]);

// цветоттенок uses slightly different slugs for "gold"
const ALLOWED_ЦВЕТОТТЕНОК_SLUGS = new Set([
  "белый",
  "хром",
  "сатин",
  "бронзовый",
  "золотистый",
  "золото",
  "графит",
  "стальной",
  "черный",
]);

const GLOBAL_VALUE_FILTERS: Record<string, Set<string>> = {
  "цвет": ALLOWED_COLOR_SLUGS,
  "цветоттенок": ALLOWED_ЦВЕТОТТЕНОК_SLUGS,
};

// ─── Per-category attribute allowlists ────────────────────────────────────────
// Ordered list of attribute slugs to show. Anything not listed is hidden.
// Categories not in this map show all attributes (with global value filters still applied).

const CATEGORY_ATTRIBUTE_ALLOWLISTS: Record<string, string[]> = {
  smesiteli: [
    "встраиваемый-монтаж",
    "конструкция-излива",
    "материал-корпуса",
    "материал-лейки",
    "назначение",
    "режим-тропический-дождь",
    "способ-монтажа",
    "степень-глянца",
    "страна-производитель",
    "цвет",
  ],
  "dushevye-sistemy": [
    "встраиваемый-монтаж",
    "количество-режимов-верхнего-душа",
    "количество-режимов-лейки",
    "материал",
    "материал-лейки",
    "назначение",
    "режим-тропический-дождь",
    "способ-монтажа",
    "страна-производитель",
    "цветоттенок",
  ],
  "gigienicheskie-dushi": [
    "встраиваемый-монтаж",
    "материал-лейки",
    "способ-монтажа",
    "страна-производитель",
    "цветоттенок",
  ],
  unitazy: [
    "материал",
    "назначение",
    "тип",
  ],
  polotentsesushiteli: [
    "вид-подключения",
    "тип",
    "форма",
    "материал",
    "высота",
    "ширина",
    "цвет",
  ],
  "dushevye-kabiny": [
    "материал",
    "тип",
    "форма",
    "цвет",
  ],
  armatura: [
    "материал",
    "назначение",
    "тип",
  ],
  "aksessuary-dlya-vannoj": [
    "материал",
    "назначение",
    "тип",
    "цвет",
    "страна-производитель",
  ],
};

// ─── Filter function ───────────────────────────────────────────────────────────

export function filterFacetData(data: FacetData, categorySlug: string): FacetData {
  const allowlist = CATEGORY_ATTRIBUTE_ALLOWLISTS[categorySlug];

  // Step 1: apply global value filters (color cleanup) to all attributes
  const attributesWithValueFilters = data.attributes
    .map((attr) => {
      const allowed = GLOBAL_VALUE_FILTERS[attr.slug];
      if (!allowed) return attr;
      const filtered = attr.values.filter((v) => allowed.has(v.slug));
      return { ...attr, values: filtered };
    })
    // Drop attributes whose values were fully filtered out
    .filter((attr) => attr.values.length > 0);

  // Step 2: if no allowlist for this category, return with only value filters applied
  if (!allowlist) {
    return { ...data, attributes: attributesWithValueFilters };
  }

  // Step 3: keep only allowed slugs, in config order
  const bySlug = new Map(attributesWithValueFilters.map((a) => [a.slug, a]));
  const filtered = allowlist
    .map((slug) => bySlug.get(slug))
    .filter((a): a is NonNullable<typeof a> => a !== undefined);

  return { ...data, attributes: filtered };
}
