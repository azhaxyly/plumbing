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
  цвет: ALLOWED_COLOR_SLUGS,
  цветоттенок: ALLOWED_ЦВЕТОТТЕНОК_SLUGS,
};

// ─── Per-category attribute allowlists ────────────────────────────────────────
// Ordered list of attribute slugs to show. Anything not listed is hidden.
// Categories not in this map show all attributes (with global value filters still applied).

const CATEGORY_ATTRIBUTE_ALLOWLISTS: Record<string, string[]> = {
  // 2–227 distinct values per attr (verified from DB)
  smesiteli: [
    "встраиваемый-монтаж",
    "конструкция-излива",
    "материал-корпуса",
    "материал-лейки",
    "назначение",
    "режим-тропический-дождь",
    "способ-монтажа",
    "степень-глянца",
    "тип",
    "цвет",
  ],
  "dushevye-sistemy": [
    "встраиваемый-монтаж",
    "количество-режимов-верхнего-душа",
    "количество-режимов-лейки",
    "материал",
    "материал-лейки",
    "покрытие",
    "режим-тропический-дождь",
    "способ-монтажа",
    "тип",
    "тип-монтажа",
  ],
  "gigienicheskie-dushi": [
    "встраиваемый-монтаж",
    "держатель-для-душевой-лейки",
    "комплектация",
    "материал-лейки",
    "материал-стойки",
    "покрытие",
    "способ-монтажа",
    "тип",
    "форма-лейки",
  ],
  unitazy: [
    "тип-монтажа",
    "материал",
    "форма",
    "слив",
    "организация-смывающего-потока",
    "безободковый",
    "сиденье-с-микролифтом",
    "цвет",
  ],
  polotentsesushiteli: ["вид-подключения", "тип", "форма", "материал", "высота", "ширина", "цвет"],
  "dushevye-kabiny": [
    "тип",
    "форма",
    "конструкция-дверей",
    "вид-поддона",
    "вариант-стекла",
    "цвет-профиля",
  ],
  armatura: [],
  "aksessuary-dlya-vannoj": ["тип", "материал", "назначение", "длина", "ширина"],
  vanny: [
    "типоразмер-длина",
    "типоразмер-ширина",
    "материал",
    "форма",
    "объем",
    "гидромассаж",
    "стилистика-дизайна",
    "расположение-перелива",
  ],
  vodonagrevateli: ["объем", "мощность", "макс-температура-нагрева", "количество-режимов-нагрева"],
  "dushevye-trapy": [
    "материал",
    "тип",
    "назначение",
    "диаметр-подключения",
    "регулировка-по-высоте",
    "цвет",
  ],
  installyatsii: [
    "тип-монтажа",
    "материал",
    "организация-смывающего-потока",
    "быстросъемное-сиденье",
  ],
  komplektuyushchie: ["тип", "материал", "назначение", "диаметр-подключения"],
  "moyki-kukhonnye": ["материал", "комплектация"],
  rakoviny: [
    "материал",
    "форма",
    "тип-монтажа",
    "отверстия-под-смеситель",
    "расположение-смесителя",
    "цвет",
  ],
  sifony: ["материал", "тип", "назначение", "диаметр-подключения", "покрытие", "цвет"],
  "tumby-dlya-vannoj": ["коллекция", "ширина", "высота", "глубина"],
};

// Union of every per-category allowlisted attribute slug — the set of attributes
// considered "useful" across the whole catalog. Used to narrow brand pages, which
// span multiple categories and so have no single category allowlist.
const GLOBAL_ATTRIBUTE_ALLOWLIST = new Set(Object.values(CATEGORY_ATTRIBUTE_ALLOWLISTS).flat());

// ─── Filter functions ──────────────────────────────────────────────────────────

/** Applies global per-value filters (color cleanup) and drops emptied attributes. */
function applyGlobalValueFilters(attributes: FacetData["attributes"]): FacetData["attributes"] {
  return (
    attributes
      .map((attr) => {
        const allowed = GLOBAL_VALUE_FILTERS[attr.slug];
        if (!allowed) return attr;
        const filtered = attr.values.filter((v) => allowed.has(v.slug));
        return { ...attr, values: filtered };
      })
      // Drop attributes whose values were fully filtered out
      .filter((attr) => attr.values.length > 0)
  );
}

export function filterFacetData(data: FacetData, categorySlug: string): FacetData {
  const allowlist = CATEGORY_ATTRIBUTE_ALLOWLISTS[categorySlug];

  // Step 1: apply global value filters (color cleanup) to all attributes
  const attributesWithValueFilters = applyGlobalValueFilters(data.attributes);

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

/**
 * Narrows brand-page facets to the curated attribute set (union of all category
 * allowlists), applying the same color cleanup. A brand spans many categories, so
 * there's no single allowlist — anything not useful in *any* category is hidden.
 */
export function filterBrandFacetData(data: FacetData): FacetData {
  const attributes = applyGlobalValueFilters(data.attributes).filter((attr) =>
    GLOBAL_ATTRIBUTE_ALLOWLIST.has(attr.slug),
  );

  return { ...data, attributes };
}
