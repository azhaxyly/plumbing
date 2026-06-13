/**
 * Шаг 2b реконсиляции: сборка mapping.csv из авто- и ручных решений.
 *
 * Вход (prisma/reconcile/out/):
 *   candidates.json      — товары + кандидаты (индекс = позиция в массиве)
 *   decisions-auto.json  — авторешения (auto-decide.ts): newArticle | null
 *   decisions-manual.txt — ручные решения, по строке на запись:
 *                          "<индекс> <артикул|NONE> [high|low]"
 *                          индекс ссылается на позицию в candidates.json,
 *                          артикул может содержать пробелы (напр. SA2000 1/2" CHROM),
 *                          поэтому парсинг: первый токен — индекс, последний —
 *                          уверенность (если high|low), остальное — артикул.
 *
 * Выход:
 *   mapping.csv     — формат apply-reconcile.ts:
 *                     productId;old_sku;new_article;retail_price_cents;confidence;db_name;csv_name;note
 *                     (только матчи; цена = retailPriceCents выбранного кандидата)
 *   none-report.csv — товары без соответствия в CSV (артикул остаётся):
 *                     productId;old_sku;db_name;brand;source
 *
 * Run: pnpm --filter @timsan/db reconcile:merge
 */

import fs from "fs";
import path from "path";

import { DEFAULT_CSV, OUT_DIR, loadCsvRows, normArticle, normArticleLoose } from "./lib";

const BOM = "﻿"; // чтобы Excel открывал CSV как UTF-8

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
interface AutoDecision {
  productId: string;
  oldSku: string;
  dbName: string;
  newArticle: string | null;
  csvName: string;
  retailPriceCents: number | null;
  confidence: "high" | "low";
  by: string;
}

interface MappingRow {
  productId: string;
  oldSku: string;
  newArticle: string;
  retailPriceCents: number | null;
  confidence: string;
  dbName: string;
  csvName: string;
  note: string;
}
interface NoneRow {
  productId: string;
  oldSku: string;
  dbName: string;
  brand: string;
  source: string;
}

function csvEscape(s: string): string {
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const candidates = JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, "candidates.json"), "utf-8"),
  ) as CandidateEntry[];
  const autoDecisions = JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, "decisions-auto.json"), "utf-8"),
  ) as AutoDecision[];

  // Полный CSV — для фолбэка, когда ручной артикул найден напрямую в отчёте,
  // а не среди топ-кандидатов товара (даёт цену/название для mapping).
  const csvByLoose = new Map<string, ReturnType<typeof loadCsvRows>[number]>();
  for (const r of loadCsvRows(DEFAULT_CSV)) {
    const k = normArticleLoose(r.article);
    if (!csvByLoose.has(k)) csvByLoose.set(k, r);
  }

  const mapping: MappingRow[] = [];
  const none: NoneRow[] = [];
  const warnings: string[] = [];

  // ── Авторешения ──
  for (const d of autoDecisions) {
    if (d.newArticle) {
      mapping.push({
        productId: d.productId,
        oldSku: d.oldSku,
        newArticle: d.newArticle,
        retailPriceCents: d.retailPriceCents,
        confidence: d.confidence,
        dbName: d.dbName,
        csvName: d.csvName,
        note: `auto:${d.by}`,
      });
    } else {
      none.push({
        productId: d.productId,
        oldSku: d.oldSku,
        dbName: d.dbName,
        brand: "",
        source: `auto:${d.by}`,
      });
    }
  }

  // ── Ручные решения ──
  const manualPath = path.join(OUT_DIR, "decisions-manual.txt");
  const manualLines = fs
    .readFileSync(manualPath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const seenIdx = new Set<number>();
  for (const line of manualLines) {
    const tokens = line.split(/\s+/);
    const idx = parseInt(tokens[0]!, 10);
    if (isNaN(idx)) { warnings.push(`нечитаемый индекс: "${line}"`); continue; }
    if (seenIdx.has(idx)) { warnings.push(`дубль индекса #${idx}`); continue; }
    seenIdx.add(idx);

    const entry = candidates[idx];
    if (!entry) { warnings.push(`#${idx}: нет такой записи в candidates.json`); continue; }

    // последний токен — уверенность, если это high|low
    let confidence = "";
    let articleTokens = tokens.slice(1);
    const last = articleTokens[articleTokens.length - 1]?.toLowerCase();
    if (last === "high" || last === "low") {
      confidence = last;
      articleTokens = articleTokens.slice(0, -1);
    }
    const article = articleTokens.join(" ").trim();

    if (!article || article.toUpperCase() === "NONE") {
      none.push({
        productId: entry.productId,
        oldSku: entry.sku,
        dbName: entry.dbName,
        brand: entry.dbBrand,
        source: "manual:none",
      });
      continue;
    }

    const c = entry.candidates.find(
      (cd) => normArticle(cd.article) === normArticle(article),
    );
    if (c) {
      mapping.push({
        productId: entry.productId,
        oldSku: entry.sku,
        newArticle: c.article,
        retailPriceCents: c.retailPriceCents,
        confidence: confidence || "low",
        dbName: entry.dbName,
        csvName: c.csvName,
        note: "manual",
      });
      continue;
    }

    // нет среди кандидатов — ищем артикул напрямую в полном CSV
    const csv = csvByLoose.get(normArticleLoose(article));
    if (csv) {
      mapping.push({
        productId: entry.productId,
        oldSku: entry.sku,
        newArticle: csv.article,
        retailPriceCents: csv.retailPriceCents,
        confidence: confidence || "low",
        dbName: entry.dbName,
        csvName: csv.name,
        note: "manual:csv-direct",
      });
      continue;
    }

    warnings.push(
      `#${idx}: артикул "${article}" не найден ни среди кандидатов, ни в CSV (товар ${entry.sku})`,
    );
    mapping.push({
      productId: entry.productId,
      oldSku: entry.sku,
      newArticle: article,
      retailPriceCents: null,
      confidence: confidence || "low",
      dbName: entry.dbName,
      csvName: "",
      note: "manual:article-not-found",
    });
  }

  // ── Запись ──
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const mapHeader =
    "productId;old_sku;new_article;retail_price_cents;confidence;db_name;csv_name;note";
  fs.writeFileSync(
    path.join(OUT_DIR, "mapping.csv"),
    BOM +
      [
        mapHeader,
        ...mapping.map((m) =>
          [
            m.productId,
            csvEscape(m.oldSku),
            csvEscape(m.newArticle),
            m.retailPriceCents ?? "",
            m.confidence,
            csvEscape(m.dbName),
            csvEscape(m.csvName),
            m.note,
          ].join(";"),
        ),
      ].join("\n"),
    "utf-8",
  );

  const noneHeader = "productId;old_sku;db_name;brand;source";
  fs.writeFileSync(
    path.join(OUT_DIR, "none-report.csv"),
    BOM +
      [
        noneHeader,
        ...none.map((n) =>
          [n.productId, csvEscape(n.oldSku), csvEscape(n.dbName), csvEscape(n.brand), n.source].join(";"),
        ),
      ].join("\n"),
    "utf-8",
  );

  // ── Сводка ──
  const byConf: Record<string, number> = {};
  for (const m of mapping) byConf[m.confidence] = (byConf[m.confidence] ?? 0) + 1;
  const autoMatch = mapping.filter((m) => m.note.startsWith("auto")).length;
  const manualMatch = mapping.filter((m) => m.note.startsWith("manual")).length;
  const withPrice = mapping.filter((m) => m.retailPriceCents !== null).length;

  console.log(`mapping.csv: ${mapping.length} матчей (auto ${autoMatch}, manual ${manualMatch})`);
  console.log(`  по уверенности: ${JSON.stringify(byConf)}`);
  console.log(`  с ценой из CSV: ${withPrice}`);
  console.log(`none-report.csv: ${none.length} «нет в CSV» (артикул остаётся)`);
  console.log(`Покрыто записей candidates.json: ${mapping.length + none.length} из ${candidates.length}`);
  if (warnings.length) {
    console.log(`\n⚠ Предупреждения (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

main();
