/**
 * Шаг 2а реконсиляции: автоматические решения по доменным правилам для
 * товаров из candidates.json. Остаток — на ручное сопоставление (ИИ/человек).
 *
 * Правила:
 *   1. «Код в названии»: для брендов, чьи названия содержат точный код модели
 *      (Grohe 26075GL0, Haiba HB60809, Bravat F1421454CP-ENG, Lemark LM3722BL,
 *      Grossman GR-4455S, Alcaplast A45B): если код есть в CSV — матч; если
 *      кода нет во всём CSV — товара нет в отчёте → none (артикул остаётся).
 *   2. Полотенцесушители (Двин/Beste/Terminus/Олимп): сопоставление по
 *      атрибутам — габариты, электро/водяной, линейка модели, П-число, цвет;
 *      цена (ratio 14/13 или 1.0 к цене БД) — тай-брейк между цвет-вариантами.
 *   3. Ценовой дискриминатор: единственный кандидат с точным попаданием цены
 *      (<0.5%) и сопоставимым скорингом названия.
 *
 * Выход: out/decisions-auto.json + out/manual-review.txt (остаток).
 *
 * Run: pnpm --filter @timsan/db reconcile:decide
 */

import fs from "fs";
import path from "path";

import { DEFAULT_CSV, OUT_DIR, loadCsvRows, normArticleLoose } from "./lib";

interface Candidate {
  article: string;
  csvName: string;
  csvBrand: string;
  retailPriceCents: number | null;
  score: number;
}
interface CandidateEntry {
  productId: string;
  sku: string;
  dbName: string;
  dbBrand: string;
  status: string;
  priceCents: number;
  candidates: Candidate[];
}

export interface Decision {
  productId: string;
  oldSku: string;
  dbName: string;
  newArticle: string | null; // null = не найден в CSV, артикул остаётся
  csvName: string;
  retailPriceCents: number | null;
  confidence: "high" | "low";
  by: string; // какое правило приняло решение
}

const RATIO = 14 / 13; // цена БД (маркетплейс, опт+40%) / цена розницы (опт+30%)

function priceFit(dbCents: number, retailCents: number | null): number {
  if (!retailCents || !dbCents) return 99;
  const d1 = Math.abs(dbCents / RATIO - retailCents) / retailCents;
  const d2 = Math.abs(dbCents - retailCents) / retailCents;
  return Math.min(d1, d2);
}

// ─── Правило 1: точный код модели в названии ──────────────────────────────────

const CODE_PATTERNS: Record<string, RegExp[]> = {
  Grohe: [/\b\d{8}\b/g, /\b\d{5}[A-Z]{1,2}\d\b/g, /\b\d{7}[A-Z]\b/g],
  Haiba: [/\bHB[\s-]?\d{3,6}(?:-\d+)?\b/gi],
  Bravat: [/\b[FPD]\d{6,10}[A-Z]{0,4}(?:-[A-Z0-9]{1,4}){0,3}\b/gi],
  Lemark: [/\bLM\d{4,5}[A-Za-z]{0,4}\b/gi],
  Grossman: [/\bGR-?\d{4,5}[A-Z]{0,3}\b/gi],
  Alcaplast: [/\bA\d{2,4}(?:\s?[A-Z]{1,6})?(?:-\d+)?\b/g],
  Decoroom: [/\bDR\d{5}(?:-\d+)?\b/gi],
  Cersanit: [/\b[A-Z]{1,3}\d{6,8}\b/g],
};

function extractCodes(brand: string, name: string): string[] {
  const pats = CODE_PATTERNS[brand];
  if (!pats) return [];
  const codes = new Set<string>();
  for (const re of pats) {
    for (const m of name.matchAll(re)) codes.add(m[0]!);
  }
  return [...codes];
}

// ─── Правило 2: полотенцесушители по атрибутам ────────────────────────────────

function towelDims(s: string): Set<string> {
  // "50x80", "80/50", "500х800", "120/8" → "8x120" (см, отсортированная пара)
  const dims = new Set<string>();
  const re = /(\d+(?:[.,]\d+)?)\s*[xх*×\/]\s*(\d+(?:[.,]\d+)?)/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    let a = parseFloat(m[1]!.replace(",", "."));
    let b = parseFloat(m[2]!.replace(",", "."));
    if (a >= 200) a /= 10;
    if (b >= 200) b /= 10;
    if (a < 2 || b < 2) continue; // резьба 1/2, 3/4
    const [lo, hi] = a < b ? [a, b] : [b, a];
    dims.add(`${lo}x${hi}`);
  }
  return dims;
}

type HeatType = "electro" | "water" | null;

function towelType(s: string): HeatType {
  const l = s.toLowerCase();
  if (/электр|electro|тэн|диммер/.test(l)) return "electro";
  if (/водян/.test(l)) return "water";
  return null;
}

const DVIN_LINES = ["fj", "sj", "primo", "plaza", "neo", "eco", "electro"];
const DVIN_LETTERS = ["f", "r", "j", "l", "x", "s", "k"];
const BESTE_LINES = [
  "original", "etalon", "euro", "triumph", "jimmy", "plus", "квадро", "combi",
  "аврора", "классик", "евромикс", "лесенка", "дуга", "стойка", "prime",
];

function lineTokens(s: string, brand: string): Set<string> {
  const tokens = s.toLowerCase().replace(/ё/g, "е").split(/[^a-zа-я0-9]+/);
  const out = new Set<string>();
  const lines = brand === "Двин" ? DVIN_LINES : BESTE_LINES;
  const hasLineWord = tokens.some((t) => lines.includes(t));
  for (const t of tokens) {
    if (lines.includes(t)) out.add(t);
    if (brand === "Двин" && DVIN_LETTERS.includes(t) && hasLineWord) out.add(t);
    if (brand !== "Двин" && /^п\d{1,2}$/.test(t)) out.add(t); // П5/П6/П8
  }
  return out;
}

const COLOR_STEMS = [
  "бронз", "черн", "бел", "золот", "графит", "полированн", "сатин", "серебр", "хром",
];

function colorStems(s: string): Set<string> {
  const l = s.toLowerCase().replace(/ё/g, "е");
  return new Set(COLOR_STEMS.filter((c) => l.includes(c)));
}

const TOWEL_BRANDS = new Set(["Двин", "Beste", "Terminus", "Олимп"]);

function decideTowel(e: CandidateEntry): Decision | null {
  const dbDims = towelDims(e.dbName);
  const dbType = towelType(e.dbName);
  const dbLines = lineTokens(e.dbName, e.dbBrand === "Двин" ? "Двин" : "Beste");
  const dbColors = colorStems(e.dbName);

  let survivors = e.candidates.filter((c) => {
    const cDims = towelDims(c.csvName);
    if (dbDims.size && cDims.size && ![...dbDims].some((d) => cDims.has(d))) return false;
    const cType = towelType(c.csvName);
    if (dbType && cType && dbType !== cType) return false;
    const cLines = lineTokens(c.csvName, e.dbBrand === "Двин" ? "Двин" : "Beste");
    // линейка модели БД должна целиком присутствовать у кандидата и наоборот
    // (расхождение только в служебных словах допустимо)
    for (const t of dbLines) if (!cLines.has(t) && t !== "neo") return false;
    for (const t of cLines) if (!dbLines.has(t) && !["neo", "eco", "electro"].includes(t)) return false;
    return true;
  });
  if (survivors.length === 0) {
    // атрибуты распознаны, но подходящего кандидата нет → товара нет в CSV
    if (dbDims.size > 0 && dbLines.size > 0) {
      return {
        productId: e.productId, oldSku: e.sku, dbName: e.dbName,
        newArticle: null, csvName: "", retailPriceCents: null,
        confidence: "high", by: "towel:no-survivor",
      };
    }
    return null;
  }

  // фильтр по цвету, если в БД он указан
  if (dbColors.size) {
    const colorMatch = survivors.filter((c) => {
      const cc = colorStems(c.csvName);
      return [...dbColors].every((x) => cc.has(x));
    });
    if (colorMatch.length) survivors = colorMatch;
  }

  if (survivors.length === 1) {
    const c = survivors[0]!;
    return {
      productId: e.productId, oldSku: e.sku, dbName: e.dbName,
      newArticle: c.article, csvName: c.csvName, retailPriceCents: c.retailPriceCents,
      confidence: "high", by: "towel:unique",
    };
  }

  // тай-брейк по цене
  const withFit = survivors
    .map((c) => ({ c, fit: priceFit(e.priceCents, c.retailPriceCents) }))
    .sort((a, b) => a.fit - b.fit);
  const best = withFit[0]!;
  const second = withFit[1];
  if (best.fit < 0.005 && (!second || second.fit > 0.02)) {
    return {
      productId: e.productId, oldSku: e.sku, dbName: e.dbName,
      newArticle: best.c.article, csvName: best.c.csvName, retailPriceCents: best.c.retailPriceCents,
      confidence: "high", by: "towel:price",
    };
  }
  if (best.fit < 0.02) {
    return {
      productId: e.productId, oldSku: e.sku, dbName: e.dbName,
      newArticle: best.c.article, csvName: best.c.csvName, retailPriceCents: best.c.retailPriceCents,
      confidence: "low", by: "towel:price-loose",
    };
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const csvPath = process.argv[2] ?? DEFAULT_CSV;
  const csvRows = loadCsvRows(csvPath);
  const csvByLoose = new Map<string, (typeof csvRows)[number][]>();
  for (const r of csvRows) {
    const k = normArticleLoose(r.article);
    csvByLoose.set(k, [...(csvByLoose.get(k) ?? []), r]);
  }

  const entries = JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, "candidates.json"), "utf-8"),
  ) as CandidateEntry[];

  const decisions: Decision[] = [];
  const manual: CandidateEntry[] = [];

  for (const e of entries) {
    // ── Правило 1: код модели в названии ──
    const codes = extractCodes(e.dbBrand, e.dbName);
    if (codes.length > 0) {
      // если хоть один код находится в CSV — матчим на него
      let hit: (typeof csvRows)[number] | null = null;
      let ambiguous = false;
      for (const code of codes) {
        const rows = csvByLoose.get(normArticleLoose(code));
        if (rows && rows.length === 1) {
          if (hit && hit !== rows[0]) ambiguous = true;
          hit = rows[0]!;
        } else if (rows && rows.length > 1) ambiguous = true;
      }
      if (hit && !ambiguous) {
        decisions.push({
          productId: e.productId, oldSku: e.sku, dbName: e.dbName,
          newArticle: hit.article, csvName: hit.name, retailPriceCents: hit.retailPriceCents,
          confidence: "high", by: "code:in-csv",
        });
        continue;
      }
      if (!hit && !ambiguous) {
        // точный код распознан, в CSV его нет → товара нет в отчёте
        decisions.push({
          productId: e.productId, oldSku: e.sku, dbName: e.dbName,
          newArticle: null, csvName: "", retailPriceCents: null,
          confidence: "high", by: "code:absent",
        });
        continue;
      }
    }

    // ── Правило 2: полотенцесушители ──
    if (TOWEL_BRANDS.has(e.dbBrand)) {
      const d = decideTowel(e);
      if (d) { decisions.push(d); continue; }
    }

    // ── Правило 3: уникальное попадание цены ──
    const maxScore = Math.max(0, ...e.candidates.map((c) => c.score));
    const tight = e.candidates.filter(
      (c) => priceFit(e.priceCents, c.retailPriceCents) < 0.005,
    );
    if (tight.length === 1 && tight[0]!.score >= Math.max(3, maxScore - 2)) {
      decisions.push({
        productId: e.productId, oldSku: e.sku, dbName: e.dbName,
        newArticle: tight[0]!.article, csvName: tight[0]!.csvName,
        retailPriceCents: tight[0]!.retailPriceCents,
        confidence: "high", by: "price:unique",
      });
      continue;
    }

    manual.push(e);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "decisions-auto.json"),
    JSON.stringify(decisions, null, 1),
    "utf-8",
  );

  // дайджест остатка для ручного сопоставления
  const lines: string[] = [];
  manual.forEach((e) => {
    const idx = entries.indexOf(e);
    lines.push(
      `#${idx} [${e.dbBrand}] ${e.sku.slice(0, 24)} :: ${e.dbName} {${Math.round(e.priceCents / 100)}}`,
    );
    e.candidates.slice(0, 6).forEach((cd, j) => {
      const fit = priceFit(e.priceCents, cd.retailPriceCents);
      const mark = fit < 0.005 ? "P!" : fit < 0.02 ? "p~" : "  ";
      lines.push(
        ` ${j + 1}) ${mark} s${cd.score} ${cd.article} :: ${cd.csvName} {${cd.retailPriceCents ? Math.round(cd.retailPriceCents / 100) : "-"}}`,
      );
    });
  });
  fs.writeFileSync(path.join(OUT_DIR, "manual-review.txt"), lines.join("\n"), "utf-8");

  const stats: Record<string, number> = {};
  for (const d of decisions) stats[d.by] = (stats[d.by] ?? 0) + 1;
  console.log("Авторешения:", decisions.length, JSON.stringify(stats));
  console.log("Найдено в CSV:", decisions.filter((d) => d.newArticle).length);
  console.log("Нет в CSV (артикул остаётся):", decisions.filter((d) => !d.newArticle).length);
  console.log("На ручное сопоставление:", manual.length, "→ out/manual-review.txt");
}

main();
