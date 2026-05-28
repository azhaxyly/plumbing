/**
 * Reindex all active products into Meilisearch.
 * Run after import-xml or any bulk Postgres write:
 *   pnpm --filter @timsan/db reindex
 */

import fs from "fs";
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

const MEILISEARCH_URL =
  process.env["MEILISEARCH_URL"] ?? "http://localhost:7700";
const MEILISEARCH_API_KEY = process.env["MEILISEARCH_API_KEY"] ?? "";
const INDEX_NAME = "products";
const BATCH_SIZE = 500;

async function meilisearchPut(documents: object[]): Promise<void> {
  const url = `${MEILISEARCH_URL}/indexes/${INDEX_NAME}/documents?primaryKey=id`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(MEILISEARCH_API_KEY ? { Authorization: `Bearer ${MEILISEARCH_API_KEY}` } : {}),
    },
    body: JSON.stringify(documents),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meilisearch error ${res.status}: ${text}`);
  }
}

async function main() {
  const total = await prisma.product.count({ where: { status: "active" } });
  console.log(`📦 ${total} active products to index`);

  let indexed = 0;
  let skip = 0;

  while (skip < total) {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      skip,
      take: BATCH_SIZE,
      include: {
        brand: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
        variants: { select: { quantity: true, reserved: true } },
      },
    });

    const docs = products.map((p) => {
      const totalAvailable = p.variants.reduce(
        (sum, v) => sum + (v.quantity - v.reserved),
        0,
      );
      return {
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
        inStock: totalAvailable > 0,
        createdAt: p.createdAt.toISOString(),
      };
    });

    await meilisearchPut(docs);
    indexed += docs.length;
    skip += BATCH_SIZE;
    console.log(`  ✅ ${indexed}/${total}`);
  }

  console.log(`🎉 Reindex complete: ${indexed} products sent to Meilisearch`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
