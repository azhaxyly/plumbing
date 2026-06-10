/**
 * One-time migration: redistribute products from "Прочее" to proper categories.
 *
 * Run: pnpm --filter @timsan/db exec tsx prisma/reclassify-prochee.ts
 */

import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

// Rules are evaluated in order — first match wins.
const RULES: { pattern: RegExp; slug: string }[] = [
  // ── Трапы и желоба ────────────────────────────────────────────────────────
  { pattern: /трап|желоб|дренажный канал/i,                    slug: "dushevye-trapy" },

  // ── Полотенцесушители ─────────────────────────────────────────────────────
  { pattern: /^двин\b|^двин\s/i,                               slug: "polotentsesushiteli" },
  { pattern: /point.*гермес|гермес.*point/i,                   slug: "polotentsesushiteli" },

  // ── Душевые системы и стойки ──────────────────────────────────────────────
  { pattern: /душевая стойка|стойка душевая|душевая система/i, slug: "dushevye-sistemy" },

  // ── Поддоны (Beste) → Душевые кабины/ограждения ──────────────────────────
  { pattern: /^beste\b|^хендрикс/i,                            slug: "dushevye-kabiny" },

  // ── Комплектующие и запчасти ──────────────────────────────────────────────
  {
    pattern: /впускной механизм|смывное устройство|комплект для смыва|патрубок для подвода|колено смыва|перегородка a91|сетка для слива|торцевой переходник|гидрозатвор|манжета a990/i,
    slug: "komplektuyushchie",
  },

  // ── Сифоны — донные клапаны ───────────────────────────────────────────────
  { pattern: /донный клапан|alcaplast a392/i,                  slug: "sifony" },

  // ── Аксессуары для ванной ─────────────────────────────────────────────────
  { pattern: /излив|ручной душ|рукоятка для душа|шпилька сантехни/i, slug: "aksessuary-dlya-vannoj" },

  // ── Смесители — встраиваемые части, термостаты, наборы ───────────────────
  {
    pattern: /внешняя часть смесителя|встраиваемый box|панель управления смесителем|встраиваемая панель|комплект смесителей/i,
    slug: "smesiteli",
  },

  // ── Заглушки, клапаны раковины ────────────────────────────────────────────
  { pattern: /заглушка для раковины/i,                         slug: "sifony" },

  // ── Краны сливные / запорная арматура ────────────────────────────────────
  { pattern: /кран сливной|писсуарный/i,                       slug: "armatura" },

  // ── Оставшиеся товары без описания — Bravat, Lemark, Haiba → Смесители ──
  { pattern: /^bravat\b|^haiba\b|^lemark\b/i,                  slug: "smesiteli" },
];

async function main() {
  // ── Load category id map ──────────────────────────────────────────────────
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const procheeId = bySlug.get("prochee");
  if (!procheeId) throw new Error("Категория 'prochee' не найдена");

  // ── Fetch all products currently in прочее ────────────────────────────────
  const rows = await prisma.productCategory.findMany({
    where: { categoryId: procheeId },
    include: { product: { select: { id: true, name: true } } },
  });

  console.log(`\n📋 Товаров в "Прочее": ${rows.length}\n`);

  const stats: Record<string, number> = {};
  let skipped = 0;

  for (const row of rows) {
    const name = row.product.name;
    let targetSlug: string | null = null;

    for (const rule of RULES) {
      if (rule.pattern.test(name)) {
        targetSlug = rule.slug;
        break;
      }
    }

    if (!targetSlug) {
      skipped++;
      continue;
    }

    const targetId = bySlug.get(targetSlug);
    if (!targetId) {
      console.warn(`  ⚠ Категория ${targetSlug} не найдена в БД`);
      skipped++;
      continue;
    }

    await prisma.productCategory.update({
      where: { productId_categoryId: { productId: row.productId, categoryId: procheeId } },
      data: { categoryId: targetId },
    });

    stats[targetSlug] = (stats[targetSlug] ?? 0) + 1;
  }

  // ── Update productsCount for all affected categories ──────────────────────
  const affectedSlugs = ["prochee", ...Object.keys(stats)];
  for (const slug of affectedSlugs) {
    const id = bySlug.get(slug);
    if (!id) continue;
    const count = await prisma.productCategory.count({ where: { categoryId: id } });
    await prisma.category.update({ where: { id }, data: { productsCount: count } });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("✅ Перемещено:");
  for (const [slug, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    const name = categories.find((c) => c.slug === slug)?.slug ?? slug;
    console.log(`   ${String(count).padStart(3)}  →  ${name}`);
  }
  if (skipped > 0) {
    console.log(`\n  ⚠ Осталось в "Прочее" (не распознаны): ${skipped}`);
  }
  console.log("\n🎉 Готово.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
