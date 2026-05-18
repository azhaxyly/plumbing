/**
 * Seed script for @whitehouse/db
 *
 * Creates:
 *  - 1 admin user (admin@example.com / admin123)
 *  - 3 root categories + 2 sub-categories under "Ванны"
 *  - 2 brands: Roca, Grohe
 *  - 2 demo products with variants and images
 *
 * Idempotent: uses upsert throughout — safe to run multiple times.
 *
 * Run with:
 *   pnpm --filter @whitehouse/db seed
 */

import { PrismaClient } from "../generated/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Admin user ────────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash("admin123", {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      role: "admin",
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Root categories ───────────────────────────────────────────────────────
  const catBathtubs = await prisma.category.upsert({
    where: { slug: "bathtubs" },
    update: {},
    create: {
      slug: "bathtubs",
      name: "Ванны",
      description: "Акриловые, чугунные и стальные ванны",
      position: 1,
      seoTitle: "Ванны — купить в Казахстане",
      seoDescription: "Широкий выбор ванн: акриловые, чугунные, стальные. Доставка по Казахстану.",
      seoKeywords: "ванны, купить ванну, акриловые ванны, чугунные ванны",
    },
  });

  const catShowerCabins = await prisma.category.upsert({
    where: { slug: "shower-cabins" },
    update: {},
    create: {
      slug: "shower-cabins",
      name: "Душевые кабины",
      description: "Душевые кабины и поддоны",
      position: 2,
      seoTitle: "Душевые кабины — купить в Казахстане",
      seoDescription: "Душевые кабины и поддоны. Доставка по Казахстану.",
      seoKeywords: "душевые кабины, душевой поддон, купить душевую кабину",
    },
  });

  const catBathroomFurniture = await prisma.category.upsert({
    where: { slug: "bathroom-furniture" },
    update: {},
    create: {
      slug: "bathroom-furniture",
      name: "Мебель для ванной",
      description: "Тумбы, зеркала, шкафы для ванной комнаты",
      position: 3,
      seoTitle: "Мебель для ванной — купить в Казахстане",
      seoDescription: "Мебель для ванной комнаты: тумбы, зеркала, шкафы. Доставка по Казахстану.",
      seoKeywords: "мебель для ванной, тумба под раковину, зеркало в ванную",
    },
  });

  console.log(`✅ Root categories: ${catBathtubs.name}, ${catShowerCabins.name}, ${catBathroomFurniture.name}`);

  // ─── Sub-categories under "Ванны" ──────────────────────────────────────────
  const catAcrylicBathtubs = await prisma.category.upsert({
    where: { slug: "acrylic-bathtubs" },
    update: {},
    create: {
      slug: "acrylic-bathtubs",
      name: "Акриловые ванны",
      description: "Лёгкие и тёплые акриловые ванны",
      parentId: catBathtubs.id,
      position: 1,
      seoTitle: "Акриловые ванны — купить в Казахстане",
      seoDescription: "Акриловые ванны различных форм и размеров. Доставка по Казахстану.",
      seoKeywords: "акриловые ванны, купить акриловую ванну",
    },
  });

  const catCastIronBathtubs = await prisma.category.upsert({
    where: { slug: "cast-iron-bathtubs" },
    update: {},
    create: {
      slug: "cast-iron-bathtubs",
      name: "Чугунные ванны",
      description: "Классические чугунные ванны с долгим сроком службы",
      parentId: catBathtubs.id,
      position: 2,
      seoTitle: "Чугунные ванны — купить в Казахстане",
      seoDescription: "Чугунные ванны — надёжность и долговечность. Доставка по Казахстану.",
      seoKeywords: "чугунные ванны, купить чугунную ванну",
    },
  });

  console.log(`✅ Sub-categories: ${catAcrylicBathtubs.name}, ${catCastIronBathtubs.name}`);

  // ─── Brands ────────────────────────────────────────────────────────────────
  const brandRoca = await prisma.brand.upsert({
    where: { slug: "roca" },
    update: {},
    create: {
      slug: "roca",
      name: "Roca",
      description: "Испанский производитель сантехники с более чем 100-летней историей.",
    },
  });

  const brandGrohe = await prisma.brand.upsert({
    where: { slug: "grohe" },
    update: {},
    create: {
      slug: "grohe",
      name: "Grohe",
      description: "Немецкий бренд премиальной сантехники и смесителей.",
    },
  });

  console.log(`✅ Brands: ${brandRoca.name}, ${brandGrohe.name}`);

  // ─── Demo product 1: Roca acrylic bathtub ─────────────────────────────────
  const product1 = await prisma.product.upsert({
    where: { sku: "ROCA-HALL-170" },
    update: {},
    create: {
      slug: "roca-hall-170",
      name: "Ванна акриловая Roca Hall 170×75",
      sku: "ROCA-HALL-170",
      brandId: brandRoca.id,
      shortDescription: "Прямоугольная акриловая ванна Roca Hall, 170×75 см",
      description:
        "Акриловая ванна Roca Hall — классическая прямоугольная форма, усиленное дно, " +
        "антискользящее покрытие. Изготовлена из высококачественного акрила толщиной 5 мм. " +
        "Идеально подходит для стандартных ванных комнат.",
      // 89 900 KZT × 100 = 8 990 000 тийинов
      priceCents: 8_990_000,
      // 99 900 KZT × 100
      compareAtPriceCents: 9_990_000,
      status: "active",
      seoTitle: "Ванна акриловая Roca Hall 170×75 — купить в Казахстане",
      seoDescription:
        "Купить акриловую ванну Roca Hall 170×75 в Казахстане. Доставка по всей стране.",
      seoKeywords: "roca hall, акриловая ванна 170, купить ванну roca",
    },
  });

  // Variant for product 1
  const variant1 = await prisma.productVariant.upsert({
    where: { sku: "ROCA-HALL-170-WHT" },
    update: {},
    create: {
      productId: product1.id,
      sku: "ROCA-HALL-170-WHT",
      priceCents: 8_990_000,
      attributes: { color: "Белый", size: "170×75" },
      quantity: 5,
      reserved: 0,
    },
  });

  // Update defaultVariantId
  await prisma.product.update({
    where: { id: product1.id },
    data: { defaultVariantId: variant1.id },
  });

  // Image for product 1
  await prisma.productImage.upsert({
    where: { id: `img-${product1.id}-1` },
    update: {},
    create: {
      id: `img-${product1.id}-1`,
      productId: product1.id,
      url: "https://placehold.co/800x600/e2e8f0/64748b?text=Roca+Hall+170",
      alt: "Ванна акриловая Roca Hall 170×75",
      position: 0,
      isPrimary: true,
    },
  });

  // Link product 1 to categories
  await prisma.productCategory.upsert({
    where: { productId_categoryId: { productId: product1.id, categoryId: catBathtubs.id } },
    update: {},
    create: { productId: product1.id, categoryId: catBathtubs.id },
  });
  await prisma.productCategory.upsert({
    where: { productId_categoryId: { productId: product1.id, categoryId: catAcrylicBathtubs.id } },
    update: {},
    create: { productId: product1.id, categoryId: catAcrylicBathtubs.id },
  });

  console.log(`✅ Product 1: ${product1.name}`);

  // ─── Demo product 2: Grohe shower system ──────────────────────────────────
  const product2 = await prisma.product.upsert({
    where: { sku: "GROHE-RAINSHOWER-310" },
    update: {},
    create: {
      slug: "grohe-rainshower-system-310",
      name: "Душевая система Grohe Rainshower System 310",
      sku: "GROHE-RAINSHOWER-310",
      brandId: brandGrohe.id,
      shortDescription: "Верхний душ Grohe Rainshower System 310, хром",
      description:
        "Душевая система Grohe Rainshower System 310 — верхний душ диаметром 310 мм, " +
        "три режима струи (дождь, каскад, массаж), термостатический смеситель. " +
        "Хромированное покрытие StarLight® устойчиво к царапинам и загрязнениям.",
      // 145 000 KZT × 100
      priceCents: 14_500_000,
      status: "active",
      seoTitle: "Душевая система Grohe Rainshower System 310 — купить в Казахстане",
      seoDescription:
        "Купить душевую систему Grohe Rainshower System 310 в Казахстане. Доставка по всей стране.",
      seoKeywords: "grohe rainshower, душевая система, верхний душ grohe",
    },
  });

  // Variant for product 2
  const variant2 = await prisma.productVariant.upsert({
    where: { sku: "GROHE-RAINSHOWER-310-CHR" },
    update: {},
    create: {
      productId: product2.id,
      sku: "GROHE-RAINSHOWER-310-CHR",
      priceCents: 14_500_000,
      attributes: { color: "Хром", finish: "StarLight" },
      quantity: 3,
      reserved: 0,
    },
  });

  // Update defaultVariantId
  await prisma.product.update({
    where: { id: product2.id },
    data: { defaultVariantId: variant2.id },
  });

  // Images for product 2
  await prisma.productImage.upsert({
    where: { id: `img-${product2.id}-1` },
    update: {},
    create: {
      id: `img-${product2.id}-1`,
      productId: product2.id,
      url: "https://placehold.co/800x600/e2e8f0/64748b?text=Grohe+Rainshower+310",
      alt: "Душевая система Grohe Rainshower System 310",
      position: 0,
      isPrimary: true,
    },
  });

  // Link product 2 to shower-cabins category
  await prisma.productCategory.upsert({
    where: { productId_categoryId: { productId: product2.id, categoryId: catShowerCabins.id } },
    update: {},
    create: { productId: product2.id, categoryId: catShowerCabins.id },
  });

  console.log(`✅ Product 2: ${product2.name}`);

  // ─── Default settings ──────────────────────────────────────────────────────
  const defaultSettings = [
    { key: "shop_name", value: "Whitehouse" },
    { key: "shop_phone", value: "+7 700 000 00 00" },
    { key: "shop_email", value: "info@example.com" },
    { key: "shop_legal_name", value: "ТОО «Whitehouse»" },
    { key: "cod_enabled", value: "false" },
    { key: "search_fallback_enabled", value: "false" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        updatedByUserId: admin.id,
      },
    });
  }

  console.log(`✅ Default settings seeded`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
