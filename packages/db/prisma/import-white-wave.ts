/**
 * Import White Wave brand and products scraped from bulak-opt.kz/white-wave
 *
 * Creates:
 *  - Brand: White Wave
 *  - Category: Ванны (upsert)
 *  - 6 steel bathtub products with images and technical attributes
 *
 * Run: pnpm --filter @timsan/db exec tsx prisma/import-white-wave.ts
 */

import fs from "fs";
import { PrismaClient } from "../generated/client";

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

const prisma = new PrismaClient();

// ─── Product data ─────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    slug: "white-wave-classic-1500",
    sku: "WW-L-1500",
    name: "Ванна стальная Classic 1500 (White Wave)",
    shortDescription: "Стальная ванна с дизайном, оптимально использующим внутреннее пространство. В комплекте: ножки, заземление, крепёж.",
    images: [
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/full_58656_214157_10.jpg",
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/full_51207_313033_10.jpg",
    ],
    attributes: {
      "Длина": "1500 мм",
      "Ширина": "750 мм",
      "Высота": "380 мм",
      "Вес": "30 кг",
      "Объём": "108 л",
      "Страна производства": "Казахстан",
      "Комплектация": "Ножки, заземление, крепёж",
    },
  },
  {
    slug: "white-wave-classic-1700",
    sku: "WW-L-1700",
    name: "Ванна стальная Classic 1700 (White Wave)",
    shortDescription: "Стальная ванна с дизайном, оптимально использующим внутреннее пространство. В комплекте: ножки, заземление, крепёж.",
    images: [
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/69205_24863_10.jpg",
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/34493_525421_10.jpg",
    ],
    attributes: {
      "Длина": "1700 мм",
      "Ширина": "750 мм",
      "Высота": "380 мм",
      "Вес": "35 кг",
      "Объём": "130 л",
      "Страна производства": "Казахстан",
      "Комплектация": "Ножки, заземление, крепёж",
    },
  },
  {
    slug: "white-wave-italica-1700-arm",
    sku: "WW-ITALICA-1700-ARM",
    name: "Ванна стальная Italica 1700 с подлокотниками (White Wave)",
    shortDescription: "Стальная ванна серии Italica с эргономичными подлокотниками. В комплекте: ножки, заземление, крепёж.",
    images: [
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/232_688760_11.png",
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/50140_159789_11.jpg",
    ],
    attributes: {
      "Длина": "1700 мм",
      "Ширина": "750 мм",
      "Высота": "550 мм",
      "Объём": "190 л",
      "Серия": "Italica",
      "Страна производства": "Казахстан",
      "Комплектация": "Ножки, заземление, крепёж",
    },
  },
  {
    slug: "white-wave-italica-1700-hdl",
    sku: "WW-ITALICA-1700-HDL",
    name: "Ванна стальная Italica 1700 с ручками (White Wave)",
    shortDescription: "Стальная ванна серии Italica с удобными ручками. В комплекте: ножки, заземление, крепёж.",
    images: [
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/38275_500057_11.jpg",
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/98611_588940_11.jpg",
    ],
    attributes: {
      "Длина": "1700 мм",
      "Ширина": "750 мм",
      "Высота": "550 мм",
      "Объём": "190 л",
      "Серия": "Italica",
      "Страна производства": "Казахстан",
      "Комплектация": "Ножки, заземление, крепёж",
    },
  },
  {
    slug: "white-wave-optimo-1700",
    sku: "WW-OPTIMO-1700",
    name: "Ванна стальная Optimo 1700 (White Wave)",
    shortDescription: "Стальная ванна серии Optimo с оптимальной формой для комфортного купания. В комплекте: ножки, заземление, крепёж.",
    images: [
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/full_18350_680017_12.jpeg",
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/full_48547_196189_12.jpg",
    ],
    attributes: {
      "Длина": "1700 мм",
      "Ширина": "700 мм",
      "Высота": "380 мм",
      "Вес": "28 кг",
      "Серия": "Optimo",
      "Страна производства": "Казахстан",
      "Комплектация": "Ножки, заземление, крепёж",
    },
  },
  {
    slug: "white-wave-eva-1700",
    sku: "WW-EVA-1700",
    name: "Ванна стальная Eva 1700 эмалированная с шумопоглощением (White Wave)",
    shortDescription: "Эмалированная стальная ванна с шумопоглощающим покрытием. В комплекте: ножки, заземление, крепёж.",
    images: [
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/41218_194799_11.png",
      "https://www.bulak-opt.kz/components/com_jshopping/files/img_products/55064_170331_11.jpg",
    ],
    attributes: {
      "Длина": "1700 мм",
      "Ширина": "700 мм",
      "Высота": "380 мм",
      "Вес": "30 кг",
      "Объём": "170 л",
      "Серия": "Eva",
      "Страна производства": "Казахстан",
      "Комплектация": "Ножки, заземление, крепёж",
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  const RU: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return s.toLowerCase()
    .split("").map(c => RU[c] ?? c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌊 Importing White Wave brand and products...\n");

  // Brand
  const brand = await prisma.brand.upsert({
    where: { slug: "white-wave" },
    update: { name: "White Wave" },
    create: {
      slug: "white-wave",
      name: "White Wave",
      description: "Казахстанский производитель стальных эмалированных ванн. Продукция соответствует стандартам качества и поставляется с комплектом ножек, заземления и крепежа.",
    },
  });
  console.log(`✅ Brand: ${brand.name} (id: ${brand.id})`);

  // Category
  const category = await prisma.category.upsert({
    where: { slug: "vanny" },
    update: {},
    create: { slug: "vanny", name: "Ванны", position: 7 },
  });
  console.log(`✅ Category: ${category.name} (id: ${category.id})`);

  // Attributes — upsert each unique attribute name used across all products
  const attrNames = new Set(PRODUCTS.flatMap(p => Object.keys(p.attributes)));
  const attrMap: Record<string, { id: string }> = {};

  for (const name of attrNames) {
    const slug = toSlug(name);
    let attr = await prisma.attribute.findFirst({ where: { OR: [{ name }, { slug }] } });
    if (!attr) {
      attr = await prisma.attribute.create({ data: { name, slug } });
    }
    attrMap[name] = attr;
  }
  console.log(`✅ Attributes (${attrNames.size}): ${[...attrNames].join(", ")}`);

  // Products
  let created = 0;
  let skipped = 0;

  for (const p of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      console.log(`  ⏭  Skipping existing: ${p.name}`);
      skipped++;
      continue;
    }

    const variant = await prisma.productVariant.create({
      data: { sku: `${p.sku}-V1`, priceCents: 0, quantity: 0, product: { create: {
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        shortDescription: p.shortDescription,
        brandId: brand.id,
        priceCents: 0,
        status: "active",
        categories: { create: { categoryId: category.id } },
        images: {
          create: p.images.map((url, i) => ({
            url,
            alt: p.name,
            position: i,
            isPrimary: i === 0,
          })),
        },
      } } },
      select: { id: true, productId: true },
    });
    const product = await prisma.product.update({
      where: { id: variant.productId },
      data: { defaultVariantId: variant.id },
    });

    // Attribute values
    for (const [attrName, value] of Object.entries(p.attributes)) {
      const attr = attrMap[attrName]!;
      const valueSlug = toSlug(value);

      const attrValue = await prisma.attributeValue.upsert({
        where: { attributeId_slug: { attributeId: attr.id, slug: valueSlug } },
        update: {},
        create: { attributeId: attr.id, value, slug: valueSlug },
      });

      await prisma.productAttribute.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId: attr.id } },
        update: { attributeValueId: attrValue.id },
        create: {
          productId: product.id,
          attributeId: attr.id,
          attributeValueId: attrValue.id,
        },
      });
    }

    console.log(`  ✓ Created: ${p.name}`);
    created++;
  }

  // Update category product count
  const count = await prisma.productCategory.count({ where: { categoryId: category.id } });
  await prisma.category.update({
    where: { id: category.id },
    data: { productsCount: count },
  });

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
  console.log(`   Category "Ванны" now has ${count} products total.`);
}

main()
  .catch((e) => { console.error("❌ Import failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
