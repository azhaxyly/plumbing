/**
 * Redis-backed cache for facet data.
 * TTL: 60 seconds per category.
 */

const FACET_TTL_SECONDS = 60;

function facetKey(categoryId: string): string {
  return `facets:${categoryId}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandFacet {
  id: string;
  slug: string;
  name: string;
}

export interface AttributeValueFacet {
  id: string;
  value: string;
  slug: string;
}

export interface AttributeFacet {
  id: string;
  name: string;
  slug: string;
  values: AttributeValueFacet[];
}

export interface FacetData {
  brands: BrandFacet[];
  attributes: AttributeFacet[];
  priceRange: { min: number; max: number }; // in tiyins
}

// ─── Lazy Redis client ────────────────────────────────────────────────────────

async function getRedis() {
  const { Redis } = await import("ioredis");
  return new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

// ─── Cache operations ─────────────────────────────────────────────────────────

/**
 * Reads facet data from Redis for the given category.
 * Returns null on cache miss or Redis error.
 */
export async function getCachedFacets(
  categoryId: string,
): Promise<FacetData | null> {
  let redis: Awaited<ReturnType<typeof getRedis>> | null = null;
  try {
    redis = await getRedis();
    const raw = await redis.get(facetKey(categoryId));
    if (!raw) return null;
    return JSON.parse(raw) as FacetData;
  } catch {
    return null;
  } finally {
    try {
      await redis?.quit();
    } catch {
      // ignore
    }
  }
}

/**
 * Writes facet data to Redis with a 60-second TTL.
 * Silently fails if Redis is unavailable.
 */
export async function setCachedFacets(
  categoryId: string,
  data: FacetData,
): Promise<void> {
  let redis: Awaited<ReturnType<typeof getRedis>> | null = null;
  try {
    redis = await getRedis();
    await redis.set(
      facetKey(categoryId),
      JSON.stringify(data),
      "EX",
      FACET_TTL_SECONDS,
    );
  } catch {
    // Redis unavailable — silently skip caching
  } finally {
    try {
      await redis?.quit();
    } catch {
      // ignore
    }
  }
}
