/**
 * Comprehensive attribute cleanup script.
 * Run: pnpm --filter @timsan/db exec tsx prisma/purge-garbage-attributes.ts
 */
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

// ─── 1. Attributes to delete entirely ────────────────────────────────────────
const DELETE_ENTIRELY = [
  // Phone number accidentally became an attribute
  "7-701-065-0067",
  // Availability status (values are article numbers, not a product attribute)
  "в-наличии",
  // Full product descriptions stored as attribute values
  "дополнительно",
  // Duplicate bad-slug variants of высота-см / длина-см / ширина-см / габариты
  "высотасм",   // "Высота(см)" — 1 product, dup of высота-см
  "длинасм",    // "Длина(см)"  — 1 product, dup of длина-см
  "ширинасм",   // "Ширина(см)" — 1 product, dup of ширина-см
  "габаритысм", // "Габариты(см)" — orphan
  "глубинасм",  // "Глубина(см)" — orphan
  // Pure orphans (0 product links)
  "вид-затвора",
  "вид-слива-перелива",
  "диаметр-резьбы",
  "задняя-стенка",
  "каталог",
  "количество-створок-двери",
  "количество-уровней",
  "конструкция",
  "объем-смывного-бачка",
  "объемл",
  "особенность",
  "поддон",
  "совместимость",
  "стекло",
  "тип-душевой-кабины",
  "угловая",
  "формат-душевой-кабины",
];

// ─── 2. Latin-slug duplicates to merge into Cyrillic canonical attributes ─────
// key = source (latin slug to delete), value = target (Cyrillic slug to keep)
const MERGE_INTO: Record<string, string> = {
  "strana-proizvodstva": "страна-производства", // 6 products → 340 products
  "obyom":              "объем",                // 5 products → 16 products
};

// ─── 3. Attribute name fixes ──────────────────────────────────────────────────
function cleanAttrName(raw: string): string {
  let s = raw;
  // Strip any leading non-letter/non-digit symbol (bullets, ⦁ •, etc.) + following whitespace
  s = s.replace(/^[^\wа-яёА-ЯЁa-zA-Z0-9]+\s*/u, "");
  // Replace literal tabs with a space
  s = s.replace(/\t/g, " ");
  // Collapse multiple spaces
  s = s.replace(/  +/g, " ");
  // Trim
  s = s.trim();
  // Capitalize first character
  if (s.length > 0) s = s[0]!.toUpperCase() + s.slice(1);
  return s;
}

async function deleteAttr(slug: string) {
  const attr = await prisma.attribute.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!attr) {
    console.log(`  SKIP  [${slug}] not found`);
    return;
  }
  const links = await prisma.productAttribute.deleteMany({ where: { attributeId: attr.id } });
  await prisma.attributeValue.deleteMany({ where: { attributeId: attr.id } });
  await prisma.attribute.delete({ where: { id: attr.id } });
  console.log(`  DEL   [${slug}] "${attr.name}"  (${links.count} product links removed)`);
}

async function mergeAttr(sourceSlug: string, targetSlug: string) {
  const src = await prisma.attribute.findUnique({
    where: { slug: sourceSlug },
    select: { id: true, name: true, values: { select: { id: true, slug: true } } },
  });
  const tgt = await prisma.attribute.findUnique({
    where: { slug: targetSlug },
    select: { id: true, name: true, values: { select: { id: true, slug: true } } },
  });
  if (!src) { console.log(`  SKIP  merge [${sourceSlug}] not found`); return; }
  if (!tgt) { console.log(`  SKIP  merge [${sourceSlug}] → [${targetSlug}] target not found`); return; }

  const srcLinks = await prisma.productAttribute.findMany({ where: { attributeId: src.id } });
  let moved = 0;
  let dropped = 0;

  for (const link of srcLinks) {
    // Find the source value slug
    const srcVal = src.values.find((v) => v.id === link.attributeValueId);
    if (!srcVal) continue;

    // Find matching target value
    const tgtVal = tgt.values.find((v) => v.slug === srcVal.slug);

    // Check if target already has a link for this product
    const existingTgtLink = await prisma.productAttribute.findFirst({
      where: { productId: link.productId, attributeId: tgt.id },
    });

    if (existingTgtLink) {
      // Product already has the canonical attribute — just drop this duplicate link
      await prisma.productAttribute.delete({ where: { id: link.id } });
      dropped++;
      continue;
    }

    if (tgtVal) {
      // Move link to existing target value
      await prisma.productAttribute.update({
        where: { id: link.id },
        data: { attributeId: tgt.id, attributeValueId: tgtVal.id },
      });
    } else {
      // Create a new value in the target attribute then move the link
      const newVal = await prisma.attributeValue.create({
        data: { attributeId: tgt.id, value: srcVal.slug, slug: srcVal.slug },
      });
      // Update the source value so we can look it up next iteration
      tgt.values.push({ id: newVal.id, slug: srcVal.slug });
      await prisma.productAttribute.update({
        where: { id: link.id },
        data: { attributeId: tgt.id, attributeValueId: newVal.id },
      });
    }
    moved++;
  }

  // Delete remaining orphan values + the source attribute
  await prisma.attributeValue.deleteMany({ where: { attributeId: src.id } });
  await prisma.attribute.delete({ where: { id: src.id } });
  console.log(
    `  MERGE [${sourceSlug}] → [${targetSlug}]  moved ${moved}, dropped ${dropped} duplicate links`,
  );
}

async function main() {
  console.log("\n=== Step 1: Delete garbage attributes ===");
  for (const slug of DELETE_ENTIRELY) {
    await deleteAttr(slug);
  }

  console.log("\n=== Step 2: Merge latin-slug duplicates ===");
  for (const [src, tgt] of Object.entries(MERGE_INTO)) {
    await mergeAttr(src, tgt);
  }

  console.log("\n=== Step 3: Fix attribute names (capitalize, clean formatting) ===");
  const attrs = await prisma.attribute.findMany({ select: { id: true, name: true, slug: true } });
  let renamedCount = 0;
  for (const attr of attrs) {
    const newName = cleanAttrName(attr.name);
    if (newName !== attr.name) {
      await prisma.attribute.update({ where: { id: attr.id }, data: { name: newName } });
      console.log(`  RENAME [${attr.slug}]  "${attr.name}"  →  "${newName}"`);
      renamedCount++;
    }
  }
  console.log(`  Total renamed: ${renamedCount}`);

  console.log("\n=== Step 4: Delete orphan attribute values (0 product links) ===");
  const allAttrs = await prisma.attribute.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      values: { select: { id: true, _count: { select: { products: true } } } },
    },
  });
  let orphanValCount = 0;
  for (const attr of allAttrs) {
    const orphanIds = attr.values
      .filter((v) => v._count.products === 0)
      .map((v) => v.id);
    if (orphanIds.length) {
      await prisma.attributeValue.deleteMany({ where: { id: { in: orphanIds } } });
      orphanValCount += orphanIds.length;
      console.log(`  DEL orphan values: [${attr.slug}] −${orphanIds.length}`);
    }
  }
  console.log(`  Total orphan values deleted: ${orphanValCount}`);

  console.log("\n=== Done ===");

  // Final summary
  const remaining = await prisma.attribute.count();
  const remainingVals = await prisma.attributeValue.count();
  console.log(`  Attributes remaining: ${remaining}`);
  console.log(`  AttributeValues remaining: ${remainingVals}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
