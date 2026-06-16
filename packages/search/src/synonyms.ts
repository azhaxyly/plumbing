/**
 * Curated Russian synonym groups for the product index.
 *
 * Meilisearch v1.11 has no Russian stemmer, so plurals and case forms of the
 * common category nouns ("ванна" / "ванны" / "ванну") would otherwise miss
 * each other. We seed the frequent storefront terms by hand; extend the groups
 * as new categories appear. Every word in a group becomes a synonym of every
 * other word in it.
 */

import { buildBrandSynonyms } from "./transliterate";

const CATEGORY_GROUPS: string[][] = [
  ["ванна", "ванны", "ванну", "ванной", "ванне", "ванн"],
  ["раковина", "раковины", "раковину", "раковиной", "раковин"],
  ["смеситель", "смесители", "смесителя", "смесителю", "смесителей"],
  ["унитаз", "унитазы", "унитаза", "унитазу", "унитазов"],
  ["мойка", "мойки", "мойку", "мойкой", "моек"],
  ["душ", "души", "душа", "душу", "душем"],
  ["кран", "краны", "крана", "крану", "кранов"],
  ["труба", "трубы", "трубу", "трубой", "труб"],
  ["радиатор", "радиаторы", "радиатора", "радиаторов"],
  ["бойлер", "бойлеры", "бойлера", "бойлеров"],
  ["сифон", "сифоны", "сифона", "сифонов"],
  ["инсталляция", "инсталляции", "инсталляцию", "инсталляций"],
  ["полотенцесушитель", "полотенцесушители", "полотенцесушителя"],
  ["пьедестал", "пьедесталы", "пьедестала", "пьедесталов"],
  ["фильтр", "фильтры", "фильтра", "фильтров"],
  ["шланг", "шланги", "шланга", "шлангов"],
  ["лейка", "лейки", "лейку", "леек"],
  ["комплект", "комплекты", "комплекта", "комплектующие", "комплектующих"],
];

/** Expand groups into a Meilisearch directional synonyms map (each ↔ each). */
function expandGroups(groups: string[][]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const group of groups) {
    for (const word of group) {
      map[word] = group.filter((w) => w !== word);
    }
  }
  return map;
}

/** Merge synonym maps, unioning the synonym lists for shared keys. */
function mergeSynonyms(
  ...maps: Record<string, string[]>[]
): Record<string, string[]> {
  const merged: Record<string, Set<string>> = {};
  for (const map of maps) {
    for (const [word, syns] of Object.entries(map)) {
      const set = (merged[word] ??= new Set());
      for (const s of syns) set.add(s);
    }
  }
  const out: Record<string, string[]> = {};
  for (const [word, set] of Object.entries(merged)) {
    out[word] = [...set];
  }
  return out;
}

/**
 * Build the full synonyms map for the products index: curated category forms
 * plus auto-generated cross-alphabet brand synonyms.
 */
export function buildProductSynonyms(
  brandNames: string[] = [],
): Record<string, string[]> {
  return mergeSynonyms(
    expandGroups(CATEGORY_GROUPS),
    buildBrandSynonyms(brandNames),
  );
}
