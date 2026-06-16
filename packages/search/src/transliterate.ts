/**
 * Cross-alphabet transliteration for brand search.
 *
 * Brands live in the DB in mixed alphabets ("Grohe" in Latin, "Тритон" in
 * Cyrillic). A shopper typing "triton" must still surface the "Тритон" brand,
 * and "грое" must reach "Grohe". We never know which way a brand is stored, so
 * we generate candidates in BOTH directions and let the caller match any of
 * them (DB `contains`) or register them as Meilisearch synonyms.
 *
 * Both directions are heuristic — Latin→Cyrillic is inherently ambiguous
 * (h→х vs silent, c→к vs ц). That is fine: we only need ONE candidate to line
 * up with how the brand is actually stored.
 */

// Cyrillic → Latin (practical web transliteration).
const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

// Latin → Cyrillic. Digraphs first (longest match wins), then single letters.
const LAT_DIGRAPHS: [string, string][] = [
  ["shch", "щ"], ["sch", "щ"], ["zh", "ж"], ["kh", "х"], ["ts", "ц"],
  ["ch", "ч"], ["sh", "ш"], ["yu", "ю"], ["ya", "я"], ["ye", "е"],
];
const LAT_TO_CYR: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х",
  i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п",
  q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс",
  y: "й", z: "з",
};

const HAS_CYR = /[а-яё]/i;
const HAS_LAT = /[a-z]/i;

/** Transliterate a Cyrillic word to Latin. Non-Cyrillic chars pass through. */
export function cyrToLat(word: string): string {
  let out = "";
  for (const ch of word.toLowerCase()) {
    out += ch in CYR_TO_LAT ? CYR_TO_LAT[ch] : ch;
  }
  return out;
}

/** Transliterate a Latin word to Cyrillic. Non-Latin chars pass through. */
export function latToCyr(word: string): string {
  const lower = word.toLowerCase();
  let out = "";
  let i = 0;
  outer: while (i < lower.length) {
    for (const [seq, cyr] of LAT_DIGRAPHS) {
      if (lower.startsWith(seq, i)) {
        out += cyr;
        i += seq.length;
        continue outer;
      }
    }
    const ch = lower[i]!;
    out += ch in LAT_TO_CYR ? LAT_TO_CYR[ch] : ch;
    i += 1;
  }
  return out;
}

/**
 * All distinct alphabet variants of a token, including the token itself.
 * Used to expand a search query: "triton" → ["triton", "тритон"].
 */
export function alphabetVariants(token: string): string[] {
  const variants = new Set<string>([token.toLowerCase()]);
  if (HAS_CYR.test(token)) variants.add(cyrToLat(token));
  if (HAS_LAT.test(token)) variants.add(latToCyr(token));
  return [...variants].filter((v) => v.length >= 2);
}

/**
 * Build a Meilisearch synonyms map from brand names. For every word of every
 * brand name we register the word and its cross-alphabet form as mutual
 * synonyms, so a query in either alphabet reaches the brand.
 */
export function buildBrandSynonyms(
  brandNames: string[],
): Record<string, string[]> {
  const groups = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    if (!groups.has(a)) groups.set(a, new Set());
    groups.get(a)!.add(b);
  };

  for (const name of brandNames) {
    for (const raw of name.toLowerCase().split(/[^a-zа-яё0-9]+/)) {
      if (raw.length < 2) continue;
      const variants = new Set<string>([raw]);
      if (HAS_CYR.test(raw)) variants.add(cyrToLat(raw));
      if (HAS_LAT.test(raw)) variants.add(latToCyr(raw));
      const list = [...variants].filter((v) => v.length >= 2);
      for (const a of list) for (const b of list) link(a, b);
    }
  }

  const synonyms: Record<string, string[]> = {};
  for (const [word, set] of groups) {
    if (set.size > 0) synonyms[word] = [...set];
  }
  return synonyms;
}
