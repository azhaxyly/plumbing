/**
 * Remove country attributes + merge duplicate/similar attribute groups.
 * Run: pnpm --filter @timsan/db exec tsx prisma/merge-similar-attributes.ts
 */
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

// ─── Delete entirely ──────────────────────────────────────────────────────────
const DELETE_SLUGS = [
  // Country of origin — not useful in a product catalog
  "страна",
  "страна-производитель",
  "страна-производства",
  // Warranty for specific toilet parts — can't merge (one product has all 4)
  "гарантия-на-бачок",
  "гарантия-на-клапан",
  "гарантия-на-раму",
  "гарантия-на-резиновые-части",
];

// ─── Merge groups: [source-slugs] → target-slug ───────────────────────────────
// Target is the canonical attribute (highest product count or most precise name).
const MERGE_GROUPS: { sources: string[]; target: string }[] = [
  // Max heating temperature
  {
    target: "макс-температура-нагрева",
    sources: [
      "максимальная-температура-нагрева-воды",
      "максимальная-температура-нагрева-воды-с",
      "мах-тем-ра-нагрева-воды",
      "макс-температура-воды",
    ],
  },
  // Heating time (all variants of same spec)
  {
    target: "время-нагрева-δt45c",
    sources: [
      "время-нагрева-всего-объема-δt45с",
      "время-нагрева-всего-объема-δt45с-ч-мин",
      "время-нагрева-всего-объема-δt45сч-мин",
      "время-нагрева-на-45-c",
    ],
  },
  // Max water pressure
  {
    target: "максимальное-давление-воды",
    sources: ["макс-давление-воды"],
  },
  // Min water pressure
  {
    target: "минимальное-давление-воды",
    sources: ["мин-давление-воды"],
  },
  // Voltage
  {
    target: "напряжение-сети",
    sources: ["напряжение", "напряжение-в"],
  },
  // Warranty
  {
    target: "гарантия",
    sources: ["гарантийный-срок"],
  },
  // Volume (in liters — merge the small generic into the main)
  {
    target: "объем",
    sources: ["объем-л"],
  },
  // Power (watt)
  {
    target: "мощность",
    sources: ["мощность-квт"],
  },
  // Shower head dimensions
  {
    target: "размер-верхнего-душа-мм",
    sources: ["размеры-верхнего-душа"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function deleteAttr(slug: string) {
  const attr = await prisma.attribute.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!attr) { console.log(`  SKIP  [${slug}] not found`); return; }
  const links = await prisma.productAttribute.deleteMany({ where: { attributeId: attr.id } });
  await prisma.attributeValue.deleteMany({ where: { attributeId: attr.id } });
  await prisma.attribute.delete({ where: { id: attr.id } });
  console.log(`  DEL   [${slug}] "${attr.name}"  (${links.count} product links removed)`);
}

async function mergeAttr(sourceSlug: string, targetSlug: string) {
  const src = await prisma.attribute.findUnique({
    where: { slug: sourceSlug },
    select: { id: true, name: true, values: { select: { id: true, slug: true, value: true } } },
  });
  const tgt = await prisma.attribute.findUnique({
    where: { slug: targetSlug },
    select: { id: true, name: true, values: { select: { id: true, slug: true } } },
  });
  if (!src) { console.log(`  SKIP  [${sourceSlug}] not found`); return; }
  if (!tgt) { console.log(`  SKIP  [${sourceSlug}] → [${targetSlug}] target not found`); return; }

  const srcLinks = await prisma.productAttribute.findMany({ where: { attributeId: src.id } });
  // Keep a mutable copy of target values for lookups during the loop
  const tgtValues = [...tgt.values];
  let moved = 0;
  let dropped = 0;

  for (const link of srcLinks) {
    const srcVal = src.values.find((v) => v.id === link.attributeValueId);
    if (!srcVal) continue;

    // Check if target already has this product (unique constraint)
    const existingTgtLink = await prisma.productAttribute.findFirst({
      where: { productId: link.productId, attributeId: tgt.id },
    });
    if (existingTgtLink) {
      await prisma.productAttribute.delete({ where: { id: link.id } });
      dropped++;
      continue;
    }

    // Find or create matching value in target
    let tgtVal = tgtValues.find((v) => v.slug === srcVal.slug);
    if (!tgtVal) {
      const created = await prisma.attributeValue.create({
        data: { attributeId: tgt.id, value: srcVal.value, slug: srcVal.slug },
      });
      tgtValues.push({ id: created.id, slug: created.slug });
      tgtVal = tgtValues[tgtValues.length - 1];
    }

    await prisma.productAttribute.update({
      where: { id: link.id },
      data: { attributeId: tgt.id, attributeValueId: tgtVal.id },
    });
    moved++;
  }

  // Clean up source
  await prisma.attributeValue.deleteMany({ where: { attributeId: src.id } });
  await prisma.attribute.delete({ where: { id: src.id } });
  console.log(`  MERGE [${sourceSlug}] → [${targetSlug}]  moved ${moved}, dropped ${dropped} duplicate links`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Step 1: Delete country + unmergeable attributes ===");
  for (const slug of DELETE_SLUGS) {
    await deleteAttr(slug);
  }

  console.log("\n=== Step 2: Merge similar attribute groups ===");
  for (const group of MERGE_GROUPS) {
    for (const src of group.sources) {
      await mergeAttr(src, group.target);
    }
  }

  console.log("\n=== Done ===");
  const remaining = await prisma.attribute.count();
  const remainingVals = await prisma.attributeValue.count();
  console.log(`  Attributes remaining: ${remaining}`);
  console.log(`  AttributeValues remaining: ${remainingVals}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
