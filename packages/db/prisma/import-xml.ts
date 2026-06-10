/**
 * Import products from ACTIVE.xml
 * Fields: name (model), brand, sku, price → assigned to category by keywords
 *
 * Run: pnpm --filter @timsan/db import-xml
 */

import fs from "fs";
import path from "path";

import { PrismaClient } from "../generated/client";

// Load packages/db/.env into process.env (Prisma only loads it for itself)
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
} catch { /* no .env, rely on actual env vars */ }

const prisma = new PrismaClient();

// ─── XML parser ───────────────────────────────────────────────────────────────

function parseXml(content: string) {
  const offers: { sku: string; model: string; brand: string; price: number }[] = [];
  const re = /<offer\s+sku="([^"]+)">([\s\S]*?)<\/offer>/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const sku = m[1];
    const body = m[2];
    if (!sku || !body) continue;
    const model = body.match(/<model>([^<]+)<\/model>/)?.[1]?.trim();
    const brand = body.match(/<brand>([^<]*)<\/brand>/)?.[1]?.trim() ?? "";
    const price = parseInt(body.match(/<cityprice[^>]*>(\d+)<\/cityprice>/)?.[1] ?? "0");
    if (model && price > 0) offers.push({ sku, model, brand, price });
  }
  return offers;
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

const RU: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
  к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
  х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};

function toSlug(s: string): string {
  return s.toLowerCase()
    .split("").map(c => RU[c] ?? c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

// ─── Brand map ────────────────────────────────────────────────────────────────

const BRAND_MAP: Record<string, string> = {
  point: "point",
  grohe: "grohe",
  bravat: "bravat",
  двин: "dvin",
  dvin: "dvin",
  haiba: "haiba",
  belz: "belz",
  "belz-strojka": "belz",
  lemark: "lemark",
  cersanit: "cersanit",
  decoroom: "decoroom",
  beste: "beste",
  ravak: "ravak",
};

// ─── Category definitions (ordered by detection priority) ─────────────────────

const CATEGORY_DEFS = [
  {
    slug: "polotentsesushiteli",
    name: "Полотенцесушители",
    position: 1,
    keywords: ["полотенцесушитель"],
  },
  {
    slug: "gigienicheskie-dushi",
    name: "Гигиенические души",
    position: 2,
    keywords: ["гигиенический душ"],
  },
  {
    slug: "dushevye-trapy",
    name: "Душевые трапы",
    position: 3,
    keywords: ["душевой трап", "трап для душа", " трап ", "трап apz", "трап avz", "трап ag", "трап apv", "желоб", "дренажный канал"],
  },
  {
    slug: "dushevye-kabiny",
    name: "Душевые кабины/ограждения",
    position: 4,
    keywords: ["душевая кабина", "душевой уголок", "душевое ограждение", "поддон"],
  },
  {
    slug: "dushevye-sistemy",
    name: "Душевые системы",
    position: 5,
    keywords: ["душевой набор", "гарнитур", "верхний душ", "душевая лейка", "лейка", "душевая стойка", "стойка душевая", "душевая система"],
  },
  {
    slug: "smesiteli",
    name: "Смесители",
    position: 6,
    keywords: ["смеситель", "внешняя часть смесителя", "встраиваемый box", "панель управления смесителем", "встраиваемая панель", "комплект смесителей"],
  },
  {
    slug: "unitazy",
    name: "Унитазы",
    position: 7,
    keywords: ["унитаз"],
  },
  {
    slug: "installyatsii",
    name: "Инсталляции",
    position: 8,
    keywords: ["инсталляция"],
  },
  {
    slug: "rakoviny",
    name: "Раковины",
    position: 9,
    keywords: ["раковина"],
  },
  {
    slug: "moyki-kukhonnye",
    name: "Мойки кухонные",
    position: 10,
    keywords: ["мойка кухонная", "кухонная мойка", "мойка для кухни"],
  },
  {
    slug: "sifony",
    name: "Сифоны",
    position: 11,
    keywords: ["сифон"],
  },
  {
    slug: "vodonagrevateli",
    name: "Водонагреватели",
    position: 12,
    keywords: ["водонагреватель", "бойлер"],
  },
  {
    slug: "aksessuary-dlya-vannoj",
    name: "Аксессуары для ванной",
    position: 13,
    keywords: ["держатель", "кронштейн", "шланг", "монтажный набор", "подключение для", "излив", "ручной душ", "рукоятка для душа"],
  },
  {
    slug: "zerkala",
    name: "Зеркала",
    position: 14,
    keywords: ["зеркало"],
  },
  {
    slug: "komplektuyushchie",
    name: "Комплектующие и запчасти",
    position: 15,
    keywords: ["скрытая часть", "картридж", "запчасть", "комплектующ", "впускной механизм", "смывное устройство", "комплект для смыва", "патрубок для подвода", "колено смыва", "гидрозатвор", "торцевой переходник"],
  },
  {
    slug: "armatura",
    name: "Арматура",
    position: 16,
    keywords: ["арматура", "шаровой кран", "кран шаровой", "вентиль"],
  },
  {
    slug: "tumby-dlya-vannoj",
    name: "Тумбы для ванной",
    position: 17,
    keywords: ["тумба"],
  },
  {
    slug: "vanny",
    name: "Ванны",
    position: 18,
    keywords: ["ванна акриловая", "ванна стальная", "ванна чугунная", "акриловая ванна", "гидромассажная ванна"],
  },
  {
    slug: "prochee",
    name: "Прочее",
    position: 19,
    keywords: [], // fallback — matches everything
  },
] as const;

function detectCategorySlug(model: string): string {
  const lower = model.toLowerCase();
  for (const cat of CATEGORY_DEFS) {
    if (cat.keywords.length === 0) return cat.slug; // fallback
    if (cat.keywords.some((kw: string) => lower.includes(kw))) return cat.slug;
  }
  return "prochee";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const xmlPath = path.resolve(__dirname, "../../../ACTIVE.xml");
  const offers = parseXml(fs.readFileSync(xmlPath, "utf-8"));
  console.log(`📋 Parsed ${offers.length} offers`);

  // ── Brands ────────────────────────────────────────────────────────────────────
  await prisma.brand.upsert({
    where: { slug: "other" },
    update: {},
    create: { slug: "other", name: "Прочие" },
  });
  await prisma.brand.upsert({
    where: { slug: "ravak" },
    update: {},
    create: { slug: "ravak", name: "RAVAK" },
  });

  const brands = await prisma.brand.findMany({ select: { id: true, slug: true } });
  const brandMap = new Map(brands.map(b => [b.slug, b.id]));

  // ── Categories ────────────────────────────────────────────────────────────────
  const categoryMap = new Map<string, string>(); // slug → id

  for (const def of CATEGORY_DEFS) {
    const cat = await prisma.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: { slug: def.slug, name: def.name, position: def.position },
    });
    categoryMap.set(def.slug, cat.id);
  }
  console.log(`✅ ${categoryMap.size} categories ready`);

  // ── Products ──────────────────────────────────────────────────────────────────
  let ok = 0, fail = 0;

  for (const o of offers) {
    const brandSlug =
      BRAND_MAP[o.brand.toLowerCase()] ?? (o.brand ? toSlug(o.brand) : "other");
    const brandId = brandMap.get(brandSlug) ?? brandMap.get("other")!;
    const priceCents = o.price * 100;

    const skuDigits = o.sku.replace(/\D/g, "").slice(-8);
    const slug = toSlug(o.model).slice(0, 70) + (skuDigits ? "-" + skuDigits : "");

    const categorySlug = detectCategorySlug(o.model);
    const categoryId = categoryMap.get(categorySlug)!;

    try {
      const existing = await prisma.product.findUnique({ where: { sku: o.sku } });

      if (existing) {
        await prisma.product.update({
          where: { sku: o.sku },
          data: { name: o.model, priceCents, brandId },
        });
      } else {
        await prisma.product.create({
          data: {
            slug,
            name: o.model,
            sku: o.sku,
            priceCents,
            brandId,
            status: "active",
            variants: {
              create: { sku: o.sku + "-v1", priceCents },
            },
            categories: {
              create: { categoryId },
            },
          },
        });
      }

      ok++;
    } catch (e: any) {
      console.error(`  FAIL ${o.sku}: ${e.message}`);
      fail++;
    }
  }

  console.log(`✅ ${ok} products imported, ❌ ${fail} failed`);

  // ── Update productsCount per category ─────────────────────────────────────────
  for (const [, catId] of categoryMap) {
    const count = await prisma.productCategory.count({ where: { categoryId: catId } });
    await prisma.category.update({ where: { id: catId }, data: { productsCount: count } });
  }
  console.log("✅ Category counts updated");

  // ── Reindex all active products in Meilisearch ────────────────────────────────
  console.log("🔍 Reindexing products in Meilisearch...");
  await reindexMeilisearch();
  console.log("✅ Meilisearch reindex complete");
}

async function reindexMeilisearch(): Promise<void> {
  const MEILI_URL = process.env["MEILISEARCH_URL"] ?? "http://localhost:7700";
  const MEILI_KEY = process.env["MEILISEARCH_API_KEY"] ?? "";
  const MEILI_INDEX = "products";
  const BATCH = 500;
  const total = await prisma.product.count({ where: { status: "active" } });
  let skip = 0;

  while (skip < total) {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      skip,
      take: BATCH,
      include: {
        brand: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        categories: { include: { category: { select: { id: true, name: true } } } },
        variants: { select: { quantity: true, reserved: true } },
      },
    });

    const docs = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      shortDescription: p.shortDescription,
      description: p.description,
      priceCents: p.priceCents,
      compareAtPriceCents: p.compareAtPriceCents,
      status: p.status,
      brandName: p.brand?.name ?? null,
      brandSlug: p.brand?.slug ?? null,
      categoryIds: p.categories.map((pc) => pc.category.id),
      categoryNames: p.categories.map((pc) => pc.category.name),
      primaryImageUrl: p.images[0]?.url ?? null,
      inStock: p.variants.reduce((s, v) => s + (v.quantity - v.reserved), 0) > 0,
      createdAt: p.createdAt.toISOString(),
    }));

    const res = await fetch(
      `${MEILI_URL}/indexes/${MEILI_INDEX}/documents?primaryKey=id`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}),
        },
        body: JSON.stringify(docs),
      },
    );

    if (!res.ok) {
      console.error(`  Meilisearch error ${res.status}:`, await res.text());
    } else {
      console.log(`  indexed ${skip + docs.length}/${total}`);
    }

    skip += BATCH;
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
