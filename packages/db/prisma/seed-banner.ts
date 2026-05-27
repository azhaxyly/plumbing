/**
 * Banner seed — creates one active banner with 4 linked products.
 *
 * Designed to test the flex-stretch hero-banner layout:
 *   - 4 products with varying name lengths (to verify price alignment)
 *   - Mix of discounted and full-price products (to verify badge rendering)
 *   - Placeholder images from placehold.co
 *
 * Idempotent: safe to run multiple times.
 *
 * Run with:
 *   pnpm --filter @timsan/db seed:banner
 */

import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding banner test data...");

  // ── Ensure we have a category ──────────────────────────────────────────────
  const cat = await prisma.category.upsert({
    where: { slug: "smesiteli" },
    update: {},
    create: {
      slug: "smesiteli",
      name: "Смесители",
      description: "Смесители для ванной комнаты и кухни",
      position: 0,
    },
  });

  // ── Ensure we have a brand ────────────────────────────────────────────────
  const brand = await prisma.brand.upsert({
    where: { slug: "grohe" },
    update: {},
    create: {
      slug: "grohe",
      name: "Grohe",
      description: "Немецкий бренд премиальной сантехники.",
    },
  });

  // ── 4 products with varying name lengths and discount situations ────────────
  const productDefs = [
    {
      sku: "BNR-GROHE-1000",
      slug: "grohe-eurostyle-1000",
      name: "Смеситель однорычажный Grohe Eurostyle 1000",
      priceCents: 24_900_00,       // 24 900 KZT
      compareAtPriceCents: 34_900_00,
      imageText: "Grohe+Eurostyle",
      imageBg: "dbeafe",
    },
    {
      sku: "BNR-HANSGROHE-LOGIS",
      slug: "hansgrohe-logis-100",
      name: "Смеситель для раковины Hansgrohe Logis 100 однорычажный хром",
      priceCents: 18_500_00,
      compareAtPriceCents: 22_000_00,
      imageText: "Hansgrohe+Logis",
      imageBg: "dcfce7",
    },
    {
      sku: "BNR-ROCA-L20",
      slug: "roca-l20-smesitel",
      name: "Смеситель Roca L20",
      priceCents: 12_300_00,
      compareAtPriceCents: null,   // no discount — tests conditional badge
      imageText: "Roca+L20",
      imageBg: "fce7f3",
    },
    {
      sku: "BNR-JACOB-SHOWER",
      slug: "jacob-delafon-shower-system-elite",
      name: "Душевая система с верхним душем и термостатом Jacob Delafon Shower System Elite 300 мм",
      priceCents: 89_000_00,
      compareAtPriceCents: 120_000_00,
      imageText: "Jacob+Delafon",
      imageBg: "fef9c3",
    },
  ];

  const products = [];
  for (const def of productDefs) {
    const product = await prisma.product.upsert({
      where: { sku: def.sku },
      update: {
        name: def.name,
        priceCents: def.priceCents,
        compareAtPriceCents: def.compareAtPriceCents,
      },
      create: {
        slug: def.slug,
        name: def.name,
        sku: def.sku,
        brandId: brand.id,
        priceCents: def.priceCents,
        compareAtPriceCents: def.compareAtPriceCents,
        status: "active",
        description: def.name,
        shortDescription: def.name,
      },
    });

    // Primary image
    await prisma.productImage.upsert({
      where: { id: `bnr-img-${product.id}` },
      update: {},
      create: {
        id: `bnr-img-${product.id}`,
        productId: product.id,
        url: `https://placehold.co/400x400/${def.imageBg}/475569?text=${def.imageText}`,
        alt: def.name,
        position: 0,
        isPrimary: true,
      },
    });

    // Link to category
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: cat.id } },
      update: {},
      create: { productId: product.id, categoryId: cat.id },
    });

    products.push(product);
    console.log(`  ✅ Product: ${product.name.slice(0, 50)}…`);
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
  const banner = await prisma.banner.upsert({
    where: { id: "seed-banner-spring-sale" },
    update: {
      title: "ВЕСНА В PARIS — СКИДКИ ДО 50%",
      imageUrl: "https://placehold.co/800x600/1a5276/ffffff?text=Spring+Sale",
      linkUrl: "/category/smesiteli",
      isActive: true,
    },
    create: {
      id: "seed-banner-spring-sale",
      title: "ВЕСНА В PARIS — СКИДКИ ДО 50%",
      imageUrl: "https://placehold.co/800x600/1a5276/ffffff?text=Spring+Sale",
      linkUrl: "/category/smesiteli",
      position: 0,
      isActive: true,
    },
  });
  console.log(`✅ Banner: "${banner.title}"`);

  // ── Link products to banner ────────────────────────────────────────────────
  for (let i = 0; i < products.length; i++) {
    const product = products[i]!;
    await prisma.bannerProduct.upsert({
      where: { bannerId_productId: { bannerId: banner.id, productId: product.id } },
      update: { position: i },
      create: { bannerId: banner.id, productId: product.id, position: i },
    });
  }
  console.log(`✅ Linked ${products.length} products to banner`);

  console.log("🎉 Banner seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
