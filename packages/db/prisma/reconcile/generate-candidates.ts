/**
 * Шаг 1 реконсиляции артикулов: сопоставление товаров БД со строками
 * CSV-отчёта 1С («Отчет по товарам и ценам», источник истины).
 *
 * Детерминированные проходы:
 *   1. точный артикул (case-insensitive + нормализация пробелов/кавычек);
 *   2. артикул CSV встречается как целый токен в названии товара (ровно один
 *      артикул на товар и ровно один товар на артикул).
 * Для остальных товаров генерируется топ-10 кандидатов по похожести
 * (бренд + токены названия + габариты) — их сопоставляет человек/ИИ на шаге 2.
 *
 * Ничего не пишет в БД. Результаты — в prisma/reconcile/out/:
 *   auto-matched.json  — уверенные матчи (проходы 1–2)
 *   candidates.json    — товары с кандидатами для ручного сопоставления
 *
 * Run: pnpm --filter @timsan/db reconcile:candidates [путь к CSV]
 */

import fs from "fs";
import path from "path";

import { PrismaClient } from "../../generated/client";

import {
  DEFAULT_CSV,
  OUT_DIR,
  brandsCompatible,
  extractDims,
  loadCsvRows,
  loadEnv,
  nameTokens,
  normArticle,
  normArticleLoose,
  normBrand,
} from "./lib";

loadEnv();
const prisma = new PrismaClient();

async function main() {
  const csvPath = process.argv[2] ?? DEFAULT_CSV;
  console.log(`CSV: ${csvPath}`);
  const csvRows = loadCsvRows(csvPath);
  console.log(`Товарных строк в CSV: ${csvRows.length}`);

  // Дубли артикулов: последняя строка побеждает
  const csvByArticle = new Map<string, (typeof csvRows)[number]>();
  const csvByArticleLoose = new Map<string, (typeof csvRows)[number][]>();
  for (const r of csvRows) {
    csvByArticle.set(normArticle(r.article), r);
    const loose = normArticleLoose(r.article);
    csvByArticleLoose.set(loose, [...(csvByArticleLoose.get(loose) ?? []), r]);
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      status: true,
      priceCents: true,
      brand: { select: { name: true } },
    },
  });
  console.log(`Товаров в БД: ${products.length}`);

  interface AutoMatch {
    productId: string;
    oldSku: string;
    dbName: string;
    newArticle: string;
    csvName: string;
    retailPriceCents: number | null;
    source: "sku" | "name-token";
  }

  const autoMatched: AutoMatch[] = [];
  const unmatched: typeof products = [];

  // ── Pass 1: точный/нормализованный артикул ──
  // Сначала строгая нормализация, затем «без точек/дефисов» (только при
  // однозначном совпадении).
  for (const p of products) {
    let hit = csvByArticle.get(normArticle(p.sku));
    if (!hit) {
      const loose = csvByArticleLoose.get(normArticleLoose(p.sku));
      if (loose && loose.length === 1 && normArticleLoose(p.sku).length >= 6) {
        hit = loose[0];
      }
    }
    if (hit) {
      autoMatched.push({
        productId: p.id,
        oldSku: p.sku,
        dbName: p.name,
        newArticle: hit.article,
        csvName: hit.name,
        retailPriceCents: hit.retailPriceCents,
        source: "sku",
      });
    } else {
      unmatched.push(p);
    }
  }
  console.log(`Pass 1 (артикул): ${autoMatched.length}`);

  // ── Pass 2: артикул CSV как целый токен в названии товара ──
  // Требуем взаимную однозначность: один артикул на товар, один товар на артикул.
  // Дефис включён в границы токена, чтобы артикул HB73823 не матчился в
  // названии "...HB73823-7..." (суффикс-вариант — другой товар).
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokenRes = new Map<string, RegExp>();
  for (const [key, r] of csvByArticle) {
    if (r.article.length < 4) continue;
    tokenRes.set(key, new RegExp(`(?<![A-Za-z0-9-])${escapeRe(r.article)}(?![A-Za-z0-9-])`, "i"));
  }

  const tokenHits = new Map<string, string[]>(); // productId → articleKeys
  const articleHits = new Map<string, string[]>(); // articleKey → productIds
  for (const p of unmatched) {
    for (const [key, re] of tokenRes) {
      if (re.test(p.name)) {
        tokenHits.set(p.id, [...(tokenHits.get(p.id) ?? []), key]);
        articleHits.set(key, [...(articleHits.get(key) ?? []), p.id]);
      }
    }
  }

  const pass2Count = { matched: 0, ambiguous: 0 };
  const stillUnmatched: typeof products = [];
  for (const p of unmatched) {
    const keys = tokenHits.get(p.id) ?? [];
    if (keys.length === 1 && articleHits.get(keys[0]!)!.length === 1) {
      const hit = csvByArticle.get(keys[0]!)!;
      autoMatched.push({
        productId: p.id,
        oldSku: p.sku,
        dbName: p.name,
        newArticle: hit.article,
        csvName: hit.name,
        retailPriceCents: hit.retailPriceCents,
        source: "name-token",
      });
      pass2Count.matched++;
    } else {
      if (keys.length > 0) pass2Count.ambiguous++;
      stillUnmatched.push(p);
    }
  }
  console.log(`Pass 2 (токен в названии): ${pass2Count.matched} (неоднозначных: ${pass2Count.ambiguous})`);

  // ── Pass 3: кандидаты по похожести для ручного/ИИ сопоставления ──
  const csvIndexed = csvRows.map((r) => ({
    row: r,
    brandKey: normBrand(r.brand),
    tokens: nameTokens(`${r.article} ${r.name}`),
    dims: extractDims(r.name),
  }));

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

  const candidateEntries: CandidateEntry[] = [];
  for (const p of stillUnmatched) {
    const pBrandKey = normBrand(p.brand.name);
    const pTokens = nameTokens(p.name);
    const pDims = extractDims(p.name);

    const scored: Candidate[] = [];
    for (const c of csvIndexed) {
      // бренды известны с обеих сторон — несовпадение почти исключает матч
      if (!brandsCompatible(pBrandKey, c.brandKey)) continue;

      let score = 0;
      for (const t of pTokens) {
        if (!c.tokens.has(t)) continue;
        score += /\d/.test(t) ? 2 : 1; // токены с цифрами (коды моделей) важнее
      }
      for (const d of pDims) if (c.dims.has(d)) score += 3;

      if (score > 0) {
        scored.push({
          article: c.row.article,
          csvName: c.row.name,
          csvBrand: c.row.brand,
          retailPriceCents: c.row.retailPriceCents,
          score,
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    candidateEntries.push({
      productId: p.id,
      sku: p.sku,
      dbName: p.name,
      dbBrand: p.brand.name,
      status: p.status,
      priceCents: p.priceCents,
      candidates: scored.slice(0, 10),
    });
  }

  const withCandidates = candidateEntries.filter((e) => e.candidates.length > 0).length;
  console.log(
    `Pass 3: ${candidateEntries.length} товаров без матча, у ${withCandidates} есть кандидаты`,
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "auto-matched.json"),
    JSON.stringify(autoMatched, null, 1),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "candidates.json"),
    JSON.stringify(candidateEntries, null, 1),
    "utf-8",
  );
  console.log(`\nИтого авто-матчей: ${autoMatched.length} → out/auto-matched.json`);
  console.log(`На ручное сопоставление: ${candidateEntries.length} → out/candidates.json`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
