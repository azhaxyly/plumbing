/**
 * Шаг 3 реконсиляции: применение сопоставлений к БД.
 *
 * Входные данные (prisma/reconcile/out/):
 *   auto-matched.json — уверенные матчи из generate-candidates.ts
 *   mapping.csv       — результат ручного/ИИ сопоставления (шаг 2), колонки:
 *                       productId;old_sku;new_article;retail_price_cents;confidence;db_name;csv_name;note
 *                       строки с пустым new_article или confidence=rejected пропускаются
 *
 * Для каждого товара: Product.sku → новый артикул, ProductVariant.sku → "<артикул>-v<N>",
 * priceCents (товар и вариант) → розничная цена, compareAtPriceCents → null, запись в AuditLog.
 *
 * Безопасность:
 *   - по умолчанию dry-run: только печатает план и пишет out/apply-plan.csv;
 *   - конфликты уникальности SKU (два товара претендуют на один артикул, или
 *     артикул уже занят) не применяются и попадают в out/conflicts.csv —
 *     это кандидаты на дубли товаров в БД;
 *   - статус товаров и остатки не меняются никогда.
 *
 * Run: pnpm --filter @timsan/db reconcile:apply [--apply]
 * После --apply запустить переиндексацию поиска: pnpm --filter @timsan/db reindex
 */

import fs from "fs";
import path from "path";

import { PrismaClient } from "../../generated/client";

import { OUT_DIR, loadEnv, parseCsv } from "./lib";

const BOM = "﻿"; // чтобы Excel открывал CSV как UTF-8

loadEnv();
const prisma = new PrismaClient();

interface PlannedChange {
  productId: string;
  oldSku: string;
  newArticle: string;
  retailPriceCents: number | null;
  dbName: string;
  csvName: string;
  source: string;
}

function loadAutoMatched(): PlannedChange[] {
  const file = path.join(OUT_DIR, "auto-matched.json");
  if (!fs.existsSync(file)) {
    console.warn("out/auto-matched.json не найден — пропускаю авто-матчи");
    return [];
  }
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as Array<{
    productId: string;
    oldSku: string;
    dbName: string;
    newArticle: string;
    csvName: string;
    retailPriceCents: number | null;
    source: string;
  }>;
  return data.map((m) => ({
    productId: m.productId,
    oldSku: m.oldSku,
    newArticle: m.newArticle,
    retailPriceCents: m.retailPriceCents,
    dbName: m.dbName,
    csvName: m.csvName,
    source: `auto:${m.source}`,
  }));
}

function loadMapping(): PlannedChange[] {
  const file = path.join(OUT_DIR, "mapping.csv");
  if (!fs.existsSync(file)) {
    console.warn("out/mapping.csv не найден — применяю только авто-матчи");
    return [];
  }
  const content = fs.readFileSync(file, "utf-8").replace(/^﻿/, "");
  const rows = parseCsv(content, ";");
  const changes: PlannedChange[] = [];
  for (const r of rows) {
    const [productId, oldSku, newArticle, priceRaw, confidence] = [
      (r[0] ?? "").trim(),
      (r[1] ?? "").trim(),
      (r[2] ?? "").trim(),
      (r[3] ?? "").trim(),
      (r[4] ?? "").trim().toLowerCase(),
    ];
    if (!productId || productId === "productId") continue; // заголовок/пустые
    if (!newArticle || confidence === "rejected" || confidence === "none") continue;
    const price = priceRaw ? parseInt(priceRaw, 10) : NaN;
    changes.push({
      productId,
      oldSku,
      newArticle,
      retailPriceCents: isNaN(price) ? null : price,
      dbName: (r[5] ?? "").trim(),
      csvName: (r[6] ?? "").trim(),
      source: `manual:${confidence || "unspecified"}`,
    });
  }
  return changes;
}

function csvEscape(s: string): string {
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const all = [...loadAutoMatched(), ...loadMapping()];
  console.log(`Всего сопоставлений: ${all.length}`);

  // mapping.csv может дублировать auto-matched — последняя запись побеждает
  const byProduct = new Map<string, PlannedChange>();
  for (const c of all) byProduct.set(c.productId, c);

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  // ── Конфликты уникальности SKU ──
  const conflicts: Array<PlannedChange & { reason: string }> = [];
  const planned: PlannedChange[] = [];

  // Целевой артикул → претенденты
  const byTarget = new Map<string, PlannedChange[]>();
  for (const c of byProduct.values()) {
    const key = c.newArticle.toLowerCase();
    byTarget.set(key, [...(byTarget.get(key) ?? []), c]);
  }

  for (const c of byProduct.values()) {
    const p = productById.get(c.productId);
    if (!p) {
      conflicts.push({ ...c, reason: "товар не найден в БД" });
      continue;
    }
    const targetKey = c.newArticle.toLowerCase();

    const claimants = byTarget.get(targetKey)!;
    if (claimants.length > 1) {
      // Товар, чей sku уже равен целевому артикулу, безопасен (меняется только
      // цена) — конфликтуют лишь остальные претенденты (вероятные дубли).
      if (p.sku.toLowerCase() !== targetKey) {
        conflicts.push({
          ...c,
          reason: `на артикул претендуют ${claimants.length} товара (возможный дубль в БД)`,
        });
        continue;
      }
    }

    // Артикул уже занят другим товаром, который никуда не переезжает
    const holder = products.find(
      (other) => other.id !== c.productId && other.sku.toLowerCase() === targetKey,
    );
    if (holder && !byProduct.has(holder.id)) {
      conflicts.push({
        ...c,
        reason: `артикул уже занят товаром "${holder.name}" (${holder.id}) — возможный дубль`,
      });
      continue;
    }
    if (holder && byProduct.get(holder.id)!.newArticle.toLowerCase() === targetKey) {
      conflicts.push({
        ...c,
        reason: `артикул остаётся за товаром "${holder.name}" (${holder.id}) — возможный дубль`,
      });
      continue;
    }

    planned.push(c);
  }

  // ── Отчёты ──
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const planHeader = "productId;old_sku;new_article;retail_price_cents;db_name;csv_name;source";
  fs.writeFileSync(
    path.join(OUT_DIR, "apply-plan.csv"),
    BOM +
      [
        planHeader,
        ...planned.map((c) =>
          [c.productId, c.oldSku, c.newArticle, c.retailPriceCents ?? "", csvEscape(c.dbName), csvEscape(c.csvName), c.source].join(";"),
        ),
      ].join("\n"),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "conflicts.csv"),
    BOM +
      [
        planHeader + ";reason",
        ...conflicts.map((c) =>
          [c.productId, c.oldSku, c.newArticle, c.retailPriceCents ?? "", csvEscape(c.dbName), csvEscape(c.csvName), c.source, csvEscape(c.reason)].join(";"),
        ),
      ].join("\n"),
    "utf-8",
  );

  const skuChanges = planned.filter((c) => c.oldSku !== c.newArticle).length;
  const priceChanges = planned.filter((c) => c.retailPriceCents !== null).length;
  console.log(`План: ${planned.length} товаров (смена артикула: ${skuChanges}, цена из CSV: ${priceChanges})`);
  console.log(`Конфликты (пропущены): ${conflicts.length} → out/conflicts.csv`);
  console.log(`План записан → out/apply-plan.csv`);

  if (!apply) {
    console.log("\nDRY-RUN: ничего не изменено. Запустите с --apply для применения.");
    return;
  }

  // ── Применение ──
  let updated = 0;
  let failed = 0;
  for (const c of planned) {
    const p = productById.get(c.productId)!;
    try {
      await prisma.$transaction(async (tx) => {
        const data: { sku: string; priceCents?: number; compareAtPriceCents?: null } = {
          sku: c.newArticle,
        };
        if (c.retailPriceCents !== null) {
          data.priceCents = c.retailPriceCents;
          data.compareAtPriceCents = null;
        }
        await tx.product.update({ where: { id: c.productId }, data });

        const variants = await tx.productVariant.findMany({
          where: { productId: c.productId },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });
        for (let i = 0; i < variants.length; i++) {
          await tx.productVariant.update({
            where: { id: variants[i]!.id },
            data: {
              sku: `${c.newArticle}-v${i + 1}`,
              ...(c.retailPriceCents !== null ? { priceCents: c.retailPriceCents } : {}),
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: null,
            action: "update",
            entity: "Product",
            entityId: c.productId,
            before: { sku: c.oldSku },
            after: {
              sku: c.newArticle,
              priceCents: c.retailPriceCents,
              source: `reconcile:${c.source}`,
            },
          },
        });
      });
      updated++;
    } catch (e) {
      failed++;
      console.error(`Ошибка для ${p.sku} → ${c.newArticle}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`\nПрименено: ${updated}, ошибок: ${failed}`);
  console.log("Не забудьте переиндексировать поиск: pnpm --filter @timsan/db reindex");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
