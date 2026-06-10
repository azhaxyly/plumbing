/**
 * Rename products from the Kaspi CSV export by matching article (SKU).
 * CSV column 1 = Артикул, column 3 = Номенклатура
 *
 * Dry run (preview only):   pnpm --filter @timsan/db rename-products
 * Apply changes:            pnpm --filter @timsan/db rename-products --apply
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "../generated/client";

// Load packages/db/.env into process.env
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
} catch { /* no .env */ }

const DRY_RUN = !process.argv.includes("--apply");
const prisma = new PrismaClient();

// ─── CSV parser (handles RFC 4180 quoting, including "" escape) ──────────────

function parseCSV(content: string): string[][] {
  // Strip UTF-8 BOM if present
  const text = content.startsWith("﻿") ? content.slice(1) : content;
  const rows: string[][] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const fields: string[] = [];
    let i = 0;

    while (i <= rawLine.length) {
      if (i === rawLine.length) {
        // trailing empty field after last comma
        break;
      }
      if (rawLine[i] === '"') {
        let field = "";
        i++; // skip opening quote
        while (i < rawLine.length) {
          if (rawLine[i] === '"' && rawLine[i + 1] === '"') {
            field += '"';
            i += 2;
          } else if (rawLine[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            field += rawLine[i++];
          }
        }
        if (rawLine[i] === ",") i++;
        fields.push(field.trim());
      } else {
        const end = rawLine.indexOf(",", i);
        if (end === -1) {
          fields.push(rawLine.slice(i).trim());
          break;
        }
        fields.push(rawLine.slice(i, end).trim());
        i = end + 1;
      }
    }

    rows.push(fields);
  }

  return rows;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // CSV is at the monorepo root (3 levels up from packages/db/prisma/)
  const csvPath = path.join(
    __dirname,
    "../../../Отчет по товарам и ценам Алматы.xlsx - Лист_1.csv",
  );

  if (!fs.existsSync(csvPath)) {
    console.error("CSV не найден:", csvPath);
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(csvPath, "utf-8"));

  // Find header row where column 1 = "Артикул"
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[1]?.trim() === "Артикул") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    console.error('Строка заголовка с "Артикул" не найдена');
    process.exit(1);
  }

  // Build article → name map (skip category/group rows without brand)
  const nameMap = new Map<string, string>(); // article.toLowerCase() → name
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]!;
    const article = row[1]?.trim() ?? "";
    const name    = row[3]?.trim() ?? "";
    const brand   = row[5]?.trim() ?? "";
    if (!article || !brand || !name) continue;
    if (!/[A-Za-z0-9]/.test(article)) continue;
    nameMap.set(article.toLowerCase(), name);
  }
  console.log(`Из CSV прочитано товаров: ${nameMap.size}`);

  // Load all products from DB
  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true },
  });
  console.log(`В базе найдено товаров: ${products.length}`);

  const bySkuLower = new Map(products.map((p) => [p.sku.toLowerCase(), p]));

  let updated = 0;
  let unchanged = 0;
  let notInDb = 0;

  if (DRY_RUN) {
    console.log("\n[DRY RUN] — изменения не применяются. Передайте --apply чтобы применить.\n");
  }

  for (const [articleLower, newName] of nameMap.entries()) {
    const product = bySkuLower.get(articleLower);
    if (!product) {
      notInDb++;
      continue;
    }
    if (product.name === newName) {
      unchanged++;
      continue;
    }

    console.log(`[${product.sku}]`);
    console.log(`  ДО:   ${product.name}`);
    console.log(`  ПОСЛЕ: ${newName}`);

    if (!DRY_RUN) {
      await prisma.product.update({
        where: { id: product.id },
        data: { name: newName },
      });
    }

    updated++;
  }

  console.log("\n─────────────────────────────────────────");
  if (DRY_RUN) {
    console.log(`Будет переименовано: ${updated}`);
  } else {
    console.log(`Переименовано: ${updated}`);
  }
  console.log(`Без изменений:  ${unchanged}`);
  console.log(`Не в базе:      ${notInDb}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
