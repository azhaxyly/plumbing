/**
 * Шаг 4 реконсиляции: отчёт по активным товарам, которых нет в CSV-отчёте 1С.
 *
 * Такие товары, вероятно, отсутствуют в наличии — НО бренды, исключённые из
 * самого отчёта (Grohe, Hansgrohe, IVA, VITRA, ORBITA), в список не попадают:
 * для них отсутствие в CSV ничего не означает.
 *
 * Ничего не меняет в БД. Результат — out/unmatched-report.csv: его нужно
 * просмотреть, удалить строки товаров, которые трогать нельзя, и передать
 * в zero-stock.ts для обнуления остатков.
 *
 * Run: pnpm --filter @timsan/db reconcile:unmatched [путь к CSV]
 */

import fs from "fs";
import path from "path";

import { PrismaClient } from "../../generated/client";

import {
  DEFAULT_CSV,
  EXCLUDED_BRAND_KEYS,
  OUT_DIR,
  loadCsvRows,
  loadEnv,
  normArticle,
  normBrand,
} from "./lib";

loadEnv();
const prisma = new PrismaClient();

const BOM = "﻿"; // чтобы Excel открывал CSV как UTF-8

function csvEscape(s: string): string {
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const csvPath = process.argv[2] ?? DEFAULT_CSV;
  const csvRows = loadCsvRows(csvPath);
  const csvArticles = new Set(csvRows.map((r) => normArticle(r.article)));
  console.log(`Артикулов в CSV: ${csvArticles.size}`);

  const products = await prisma.product.findMany({
    where: { status: "active" },
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      brand: { select: { name: true } },
      variants: { select: { quantity: true } },
    },
  });

  const unmatched = products.filter(
    (p) =>
      !csvArticles.has(normArticle(p.sku)) &&
      !EXCLUDED_BRAND_KEYS.has(normBrand(p.brand.name)),
  );
  const excludedCount = products.filter((p) =>
    EXCLUDED_BRAND_KEYS.has(normBrand(p.brand.name)),
  ).length;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, "unmatched-report.csv");
  fs.writeFileSync(
    out,
    BOM +
      [
        "sku;name;brand;quantity;price_tenge",
        ...unmatched.map((p) =>
          [
            p.sku,
            csvEscape(p.name),
            csvEscape(p.brand.name),
            p.variants.reduce((s, v) => s + v.quantity, 0),
            p.priceCents / 100,
          ].join(";"),
        ),
      ].join("\n"),
    "utf-8",
  );

  console.log(`Активных товаров: ${products.length}`);
  console.log(`Из них брендов, исключённых из отчёта (не проверяются): ${excludedCount}`);
  console.log(`Не найдено в CSV: ${unmatched.length} → out/unmatched-report.csv`);
  console.log(
    "\nПросмотрите файл, удалите строки, которые НЕ нужно обнулять, затем:\n" +
      "pnpm --filter @timsan/db reconcile:zero-stock -- --apply",
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
