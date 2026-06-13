/**
 * Общие хелперы скриптов реконсиляции артикулов: парсинг CSV-отчёта 1С,
 * нормализация артикулов/брендов, токенизация названий.
 */

import fs from "fs";
import path from "path";

export const DEFAULT_CSV = path.resolve(
  __dirname,
  "../../../..",
  "Копия Отчет по товарам и ценам Алматы.xlsx - Лист_1.csv",
);
export const OUT_DIR = path.resolve(__dirname, "out");

/** Load packages/db/.env into process.env (Prisma only loads it for itself). */
export function loadEnv(): void {
  try {
    const lines = fs.readFileSync(".env", "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch { /* no .env, rely on actual env vars */ }
}

// ─── CSV parsing (RFC 4180: quoted fields, "" escapes, CRLF) ─────────────────

export function parseCsv(content: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && content[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export interface CsvRow {
  code: string;
  article: string;
  name: string;
  brand: string;
  retailPriceCents: number | null;
}

/** "6 175" → 617500; "523 683,3" → 52368330 (NBSP/space = thousands, comma = decimal). */
export function parsePriceCents(raw: string): number | null {
  const cleaned = raw.replace(/[\s ]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Товарные строки отчёта 1С: колонки 0=Код, 1=Артикул, 3=Номенклатура, 5=Бренд, 8=Цена розницы. */
export function loadCsvRows(csvPath: string): CsvRow[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const raw = parseCsv(content);
  const headerIdx = raw.findIndex((r) => (r[1] ?? "").trim() === "Артикул");
  if (headerIdx === -1) throw new Error('Не найдена строка заголовка с "Артикул"');

  const rows: CsvRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i]!;
    const article = (r[1] ?? "").trim();
    const name = (r[3] ?? "").trim();
    const brand = (r[5] ?? "").trim();
    if (!article || !brand) continue; // группы/категории без артикула
    if (!/[A-Za-z0-9А-Яа-я]/.test(article)) continue;
    rows.push({
      code: (r[0] ?? "").trim(),
      article,
      name,
      brand,
      retailPriceCents: parsePriceCents((r[8] ?? "").trim()),
    });
  }
  return rows;
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/** Ключ сравнения артикулов: lower + без пробелов и кавычек. */
export function normArticle(s: string): string {
  return s.toLowerCase().replace(/[\s "']/g, "");
}

/**
 * Агрессивный ключ: дополнительно без точек и дефисов — ловит записи вида
 * "1.P206.2.S00.00B.F" (БД) ↔ "1P2062S0000BF" (CSV).
 */
export function normArticleLoose(s: string): string {
  return normArticle(s).replace(/[.\-_]/g, "");
}

/** Кросс-алфавитные алиасы брендов (БД ↔ CSV): приводим к одному ключу. */
const BRAND_ALIASES: Record<string, string> = {
  терминус: "terminus",
  тритон: "triton",
  двин: "dvin",
  дин: "dvin",
  олимп: "olimp",
};

/** Ключ сравнения брендов: lower, без скобочных уточнений и небуквенных символов. */
export function normBrand(s: string): string {
  const key = s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-zа-яё0-9]/g, "");
  return BRAND_ALIASES[key] ?? key;
}

/** Бренды совпадают, если ключи равны или один содержит другой ("сантехпром white wave"). */
export function brandsCompatible(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const STOPWORDS = new Set([
  "для", "с", "и", "на", "в", "из", "по", "под", "без", "см", "мм", "шт",
  "the", "of", "rus", "eng",
]);

/** Токены названия: lower, ё→е, латиница+кириллица+цифры, без стоп-слов. */
export function nameTokens(s: string): Set<string> {
  const tokens = s
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^a-zа-я0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/**
 * Габариты из названия: "50x80", "500*600", "60/50", "13х80" → нормализованные
 * пары "ШxВ" в см (значения ≥200 считаются миллиметрами и делятся на 10).
 */
export function extractDims(s: string): Set<string> {
  const dims = new Set<string>();
  const re = /(\d+(?:[.,]\d+)?)\s*[xх*×\/]\s*(\d+(?:[.,]\d+)?)/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    let a = parseFloat(m[1]!.replace(",", "."));
    let b = parseFloat(m[2]!.replace(",", "."));
    if (a >= 200) a /= 10;
    if (b >= 200) b /= 10;
    if (a < 2 || b < 2) continue; // отсекаем резьбу 1/2, 3/4 и т.п.
    const [lo, hi] = a < b ? [a, b] : [b, a];
    dims.add(`${lo}x${hi}`);
  }
  return dims;
}

/**
 * Бренды, исключённые из отчёта 1С: их отсутствие в CSV не означает «нет в
 * наличии». Ключи — normBrand(). БД содержит единый бренд "Grohe", который
 * нельзя разделить на исключённые/включённые части, поэтому Grohe целиком.
 */
export const EXCLUDED_BRAND_KEYS = new Set([
  "grohe",
  "hansgrohe",
  "iva",
  "vitra",
  "orbita",
]);
