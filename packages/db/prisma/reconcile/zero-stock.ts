/**
 * Шаг 5 реконсиляции: обнуление остатков по проверенному списку.
 *
 * Читает CSV со списком товаров (по умолчанию out/unmatched-report.csv,
 * первая колонка — sku) и ставит quantity = 0 всем вариантам этих товаров.
 * Предполагается, что файл уже просмотрен человеком и из него удалены
 * строки товаров, которые трогать нельзя.
 *
 * Статус товара не меняется — товар остаётся на витрине как «нет в наличии».
 * По умолчанию dry-run; изменения только с --apply.
 *
 * Run: pnpm --filter @timsan/db reconcile:zero-stock -- [--file <путь>] [--apply]
 */

import fs from "fs";
import path from "path";

import { PrismaClient } from "../../generated/client";

import { OUT_DIR, loadEnv, parseCsv } from "./lib";

loadEnv();
const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  const fileIdx = process.argv.indexOf("--file");
  const file =
    fileIdx !== -1 && process.argv[fileIdx + 1]
      ? path.resolve(process.argv[fileIdx + 1]!)
      : path.join(OUT_DIR, "unmatched-report.csv");

  if (!fs.existsSync(file)) {
    throw new Error(`Файл не найден: ${file}. Сначала запустите reconcile:unmatched.`);
  }

  const content = fs.readFileSync(file, "utf-8").replace(/^﻿/, "");
  const rows = parseCsv(content, ";");
  const skus: string[] = [];
  for (const r of rows) {
    const sku = (r[0] ?? "").trim();
    if (!sku || sku.toLowerCase() === "sku") continue; // заголовок
    skus.push(sku);
  }
  console.log(`SKU в файле: ${skus.length} (${file})`);

  const products = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: {
      id: true,
      sku: true,
      name: true,
      variants: { select: { id: true, quantity: true } },
    },
  });
  const foundSkus = new Set(products.map((p) => p.sku));
  const missing = skus.filter((s) => !foundSkus.has(s));
  if (missing.length > 0) {
    console.warn(`Не найдено в БД (пропущены): ${missing.length}: ${missing.slice(0, 10).join(", ")}…`);
  }

  const toZero = products.filter((p) => p.variants.some((v) => v.quantity > 0));
  console.log(`Товаров к обнулению (с ненулевым остатком): ${toZero.length} из ${products.length}`);

  if (!apply) {
    console.log("\nDRY-RUN: ничего не изменено. Запустите с --apply для применения.");
    return;
  }

  const result = await prisma.productVariant.updateMany({
    where: { productId: { in: products.map((p) => p.id) } },
    data: { quantity: 0 },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      action: "update",
      entity: "Product",
      entityId: "reconcile-zero-stock",
      after: { file: path.basename(file), products: products.length, variantsZeroed: result.count },
    },
  });

  console.log(`Обнулено вариантов: ${result.count}`);
  console.log("Не забудьте переиндексировать поиск: pnpm --filter @timsan/db reindex");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
