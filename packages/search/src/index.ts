/**
 * @timsan/search
 * Meilisearch wrapper for product search and indexing.
 */

import { MeiliSearch } from "meilisearch";
import type { SearchParams } from "meilisearch";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductSearchDocument {
  id: string;
  slug: string;
  name: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  status: string;
  brandName: string | null;
  brandSlug: string | null;
  categoryIds: string[];
  categoryNames: string[];
  primaryImageUrl: string | null;
  inStock: boolean;
  createdAt: string; // ISO string
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
}

export interface SearchResult {
  hits: ProductSearchDocument[];
  totalHits: number;
  query: string;
  processingTimeMs: number;
}

/**
 * Minimal Prisma client interface required for the Postgres FTS fallback.
 * Accepts the real PrismaClient from @timsan/db.
 */
export interface PrismaClientLike {
  setting: {
    findUnique(args: {
      where: { key: string };
    }): Promise<{ key: string; value: string } | null>;
  };
  $queryRaw<T = unknown>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
}

// ─── Client ───────────────────────────────────────────────────────────────────

const MEILISEARCH_URL =
  process.env["MEILISEARCH_URL"] ?? "http://localhost:7700";
const MEILISEARCH_API_KEY = process.env["MEILISEARCH_API_KEY"] ?? "";

const INDEX_NAME = "products";

let _client: MeiliSearch | null = null;
// Cached: undefined = not checked yet, true/false = result
let _indexHasDocs: boolean | undefined = undefined;

function getClient(): MeiliSearch {
  if (!_client) {
    _client = new MeiliSearch({
      host: MEILISEARCH_URL,
      apiKey: MEILISEARCH_API_KEY,
    });
  }
  return _client;
}

async function isIndexPopulated(): Promise<boolean> {
  if (_indexHasDocs !== undefined) return _indexHasDocs;
  try {
    const stats = await getClient().index(INDEX_NAME).getStats();
    _indexHasDocs = stats.numberOfDocuments > 0;
  } catch {
    _indexHasDocs = false;
  }
  return _indexHasDocs;
}

// ─── Index configuration ──────────────────────────────────────────────────────

/**
 * Configures the Meilisearch products index with the correct settings.
 * Should be called once on startup (e.g. from the worker).
 */
export async function configureProductIndex(): Promise<void> {
  const client = getClient();
  const index = client.index(INDEX_NAME);

  await index.updateSettings({
    searchableAttributes: [
      "name",
      "description",
      "shortDescription",
      "sku",
      "brandName",
      "categoryNames",
    ],
    filterableAttributes: [
      "status",
      "brandSlug",
      "categoryIds",
      "priceCents",
      "inStock",
    ],
    sortableAttributes: ["priceCents", "createdAt", "name"],
  });
}

// ─── Indexing ─────────────────────────────────────────────────────────────────

/**
 * Upserts a product document into the Meilisearch index.
 */
export async function indexProduct(
  product: ProductSearchDocument,
): Promise<void> {
  const client = getClient();
  const index = client.index(INDEX_NAME);
  await index.addDocuments([product], { primaryKey: "id" });
}

/**
 * Removes a product from the Meilisearch index.
 */
export async function deleteProductFromIndex(
  productId: string,
): Promise<void> {
  const client = getClient();
  const index = client.index(INDEX_NAME);
  await index.deleteDocument(productId);
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Searches products in Meilisearch.
 * Falls back to Postgres FTS if Meilisearch is unavailable.
 *
 * @param prismaClient - Optional Prisma client for the Postgres FTS fallback.
 *   Pass the prisma singleton from @timsan/db when calling from server code.
 */
export async function searchProducts(
  query: string,
  options?: SearchOptions,
  prismaClient?: PrismaClientLike,
): Promise<SearchResult> {
  try {
    const client = getClient();
    const index = client.index(INDEX_NAME);

    const searchParams: SearchParams = {
      limit: options?.limit ?? 24,
      offset: options?.offset ?? 0,
    };

    if (options?.filter) {
      searchParams.filter = options.filter;
    }
    if (options?.sort && options.sort.length > 0) {
      searchParams.sort = options.sort;
    }

    // If the index has never been populated, skip Meilisearch and use Postgres FTS
    if (prismaClient && !(await isIndexPopulated())) {
      console.warn("[search] Meilisearch index is empty, using Postgres FTS fallback");
      return getProductFallbackSearch(query, options, prismaClient);
    }

    const result = await index.search<ProductSearchDocument>(
      query,
      searchParams,
    );

    return {
      hits: result.hits,
      totalHits: result.estimatedTotalHits ?? result.hits.length,
      query: result.query,
      processingTimeMs: result.processingTimeMs,
    };
  } catch (err) {
    // Meilisearch unavailable — fall back to Postgres FTS if client provided
    if (prismaClient) {
      console.warn(
        "[search] Meilisearch unavailable, falling back to Postgres FTS:",
        err,
      );
      return getProductFallbackSearch(query, options, prismaClient);
    }
    // No fallback available — return empty result
    console.error("[search] Meilisearch unavailable and no fallback provided:", err);
    return { hits: [], totalHits: 0, query, processingTimeMs: 0 };
  }
}

// ─── Postgres FTS fallback ────────────────────────────────────────────────────

type RawProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  status: string;
  brand_name: string | null;
  brand_slug: string | null;
  primary_image_url: string | null;
  total_quantity: bigint | number;
  total_reserved: bigint | number;
  created_at: Date;
};

type CountRow = { count: bigint };

type CategoryRow = {
  product_id: string;
  category_id: string;
  category_name: string;
};

/**
 * Fallback search using PostgreSQL tsvector + GIN index.
 * Used when Meilisearch is unavailable or when search_fallback_enabled is set.
 *
 * @param prismaClient - Prisma client instance from @timsan/db.
 */
export async function getProductFallbackSearch(
  query: string,
  options?: SearchOptions,
  prismaClient?: PrismaClientLike,
): Promise<SearchResult> {
  if (!prismaClient) {
    return { hits: [], totalHits: 0, query, processingTimeMs: 0 };
  }

  const limit = options?.limit ?? 24;
  const offset = options?.offset ?? 0;
  const startTime = Date.now();

  if (!query.trim()) {
    return {
      hits: [],
      totalHits: 0,
      query,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Check if fallback is explicitly enabled via Setting
  let fallbackEnabled = true;
  try {
    const setting = await prismaClient.setting.findUnique({
      where: { key: "search_fallback_enabled" },
    });
    if (setting !== null) {
      fallbackEnabled = setting.value === "true" || setting.value === "1";
    }
  } catch {
    // If we can't read settings, proceed with fallback
  }

  if (!fallbackEnabled) {
    return {
      hits: [],
      totalHits: 0,
      query,
      processingTimeMs: Date.now() - startTime,
    };
  }

  const rows = await prismaClient.$queryRaw<RawProductRow[]>`
    SELECT
      p.id,
      p.slug,
      p.name,
      p.sku,
      p."shortDescription"  AS short_description,
      p.description,
      p."priceCents"         AS price_cents,
      p."compareAtPriceCents" AS compare_at_price_cents,
      p.status::text,
      b.name                AS brand_name,
      b.slug                AS brand_slug,
      (
        SELECT pi.url
        FROM "ProductImage" pi
        WHERE pi."productId" = p.id AND pi."isPrimary" = true
        LIMIT 1
      )                     AS primary_image_url,
      COALESCE(SUM(pv.quantity), 0)  AS total_quantity,
      COALESCE(SUM(pv.reserved), 0)  AS total_reserved,
      p."createdAt"          AS created_at
    FROM "Product" p
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    LEFT JOIN "ProductVariant" pv ON pv."productId" = p.id
    WHERE
      p.status = 'active'
      AND (
        to_tsvector('russian', p.name || ' ' || COALESCE(p."shortDescription", '') || ' ' || COALESCE(p.description, ''))
        || to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(p.sku, ''))
      ) @@ (plainto_tsquery('russian', ${query}) || plainto_tsquery('simple', ${query}))
    GROUP BY p.id, b.name, b.slug
    ORDER BY
      ts_rank(
        to_tsvector('russian', p.name || ' ' || COALESCE(p."shortDescription", '') || ' ' || COALESCE(p.description, ''))
        || to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(p.sku, '')),
        plainto_tsquery('russian', ${query}) || plainto_tsquery('simple', ${query})
      ) DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // Count total matches
  const countRows = await prismaClient.$queryRaw<CountRow[]>`
    SELECT COUNT(*) AS count
    FROM "Product" p
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    WHERE
      p.status = 'active'
      AND (
        to_tsvector('russian', p.name || ' ' || COALESCE(p."shortDescription", '') || ' ' || COALESCE(p.description, ''))
        || to_tsvector('simple', COALESCE(b.name, '') || ' ' || COALESCE(p.sku, ''))
      ) @@ (plainto_tsquery('russian', ${query}) || plainto_tsquery('simple', ${query}))
  `;
  const totalHits = Number(countRows[0]?.count ?? 0);

  // Fetch category IDs and names for each product
  const productIds = rows.map((r) => r.id);
  const categoryRows =
    productIds.length > 0
      ? await prismaClient.$queryRaw<CategoryRow[]>`
          SELECT
            pc."productId"  AS product_id,
            c.id            AS category_id,
            c.name          AS category_name
          FROM "ProductCategory" pc
          JOIN "Category" c ON c.id = pc."categoryId"
          WHERE pc."productId" = ANY(${productIds})
        `
      : [];

  // Group categories by product
  const categoryMap = new Map<string, { ids: string[]; names: string[] }>();
  for (const cr of categoryRows) {
    if (!categoryMap.has(cr.product_id)) {
      categoryMap.set(cr.product_id, { ids: [], names: [] });
    }
    const entry = categoryMap.get(cr.product_id)!;
    entry.ids.push(cr.category_id);
    entry.names.push(cr.category_name);
  }

  const hits: ProductSearchDocument[] = rows.map((r) => {
    const cats = categoryMap.get(r.id) ?? { ids: [], names: [] };
    const totalAvailable =
      Number(r.total_quantity) - Number(r.total_reserved);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      sku: r.sku,
      shortDescription: r.short_description,
      description: r.description,
      priceCents: r.price_cents,
      compareAtPriceCents: r.compare_at_price_cents,
      status: r.status,
      brandName: r.brand_name,
      brandSlug: r.brand_slug,
      categoryIds: cats.ids,
      categoryNames: cats.names,
      primaryImageUrl: r.primary_image_url,
      inStock: totalAvailable > 0,
      createdAt: r.created_at.toISOString(),
    };
  });

  return {
    hits,
    totalHits,
    query,
    processingTimeMs: Date.now() - startTime,
  };
}
