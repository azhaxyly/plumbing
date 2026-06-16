import { prisma } from "@timsan/db";
import { alphabetVariants, searchProducts } from "@timsan/search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EMPTY = { products: [], brands: [], categories: [] };

/** Normalise for loose word matching: lowercase, ё→е. */
function norm(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е");
}

/**
 * Loose match between a category name and a query token, tolerant of Russian
 * plural/case endings: any word of the name sharing a prefix (≥ shared length,
 * capped at 4) with the token. "ванны" matches a category named "Ванна".
 */
function categoryMatchesToken(name: string, token: string): boolean {
  const t = norm(token);
  return norm(name)
    .split(/[^a-zа-я0-9]+/)
    .some((w) => {
      const k = Math.min(4, w.length, t.length);
      return k >= 3 && w.slice(0, k) === t.slice(0, k);
    });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json(EMPTY);
  }

  // Match brands per query word, so "раковины grohe" still surfaces the Grohe
  // brand via its "grohe" token (matching the whole phrase never would).
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);

  // Expand each token across alphabets so a Latin query ("triton") reaches a
  // Cyrillic brand ("Тритон") and vice-versa.
  const brandTokenVariants = [
    ...new Set((tokens.length > 0 ? tokens : [q]).flatMap(alphabetVariants)),
  ];

  try {
    // Fetch products + matching brands in parallel.
    const [result, brandRows] = await Promise.all([
      searchProducts(
        q,
        { limit: 10, offset: 0, filter: 'status = "active"' },
        prisma,
      ),
      prisma.brand.findMany({
        where: {
          OR: brandTokenVariants.map((t) => ({
            name: { contains: t, mode: "insensitive" as const },
          })),
          products: { some: { status: "active" } },
        },
        select: { id: true, slug: true, name: true, logoUrl: true },
        take: 4,
        orderBy: { name: "asc" },
      }),
    ]);

    const products = result.hits.slice(0, 6).map((h) => ({
      id: h.id,
      slug: h.slug,
      name: h.name,
      brandName: h.brandName,
      priceCents: h.priceCents,
      primaryImageUrl: h.primaryImageUrl,
    }));

    const brands = brandRows.map((b) => ({
      slug: b.slug,
      name: b.name,
      logoUrl: b.logoUrl,
    }));

    // Brand context for category links: when the query matches a brand, the
    // category rows become "{category} {brand}" scoped to that brand.
    const brandContext = brandRows[0] ?? null;

    type CatRow = { slug: string; name: string; imageUrl: string | null };
    let categories: (CatRow & {
      brandSlug: string | null;
      brandName: string | null;
    })[] = [];

    if (brandContext) {
      // Brand query: list ALL categories that actually contain active products
      // of this brand, not just the categories of the top product hits — so
      // "grohe" surfaces every Grohe section, not only "Смесители".
      const grouped = await prisma.productCategory.groupBy({
        by: ["categoryId"],
        where: { product: { brandId: brandContext.id, status: "active" } },
        _count: { categoryId: true },
        orderBy: { _count: { categoryId: "desc" } },
        take: 20,
      });

      const countById = new Map(
        grouped.map((g) => [g.categoryId, g._count.categoryId]),
      );
      const catRows = await prisma.category.findMany({
        where: { id: { in: grouped.map((g) => g.categoryId) } },
        select: { id: true, slug: true, name: true, imageUrl: true },
      });

      // Non-brand query words (e.g. "ванны" in "ванны тритон"). Categories
      // matching them rank first so "ванны тритон" leads with "Ванны".
      const brandWords = new Set(brandContext.name.toLowerCase().split(/\s+/));
      const intentTokens = tokens.filter(
        (t) => !brandWords.has(t.toLowerCase()),
      );

      categories = catRows
        .sort((a, b) => {
          const am = intentTokens.some((t) => categoryMatchesToken(a.name, t));
          const bm = intentTokens.some((t) => categoryMatchesToken(b.name, t));
          if (am !== bm) return am ? -1 : 1;
          return (countById.get(b.id) ?? 0) - (countById.get(a.id) ?? 0);
        })
        .slice(0, 4)
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          imageUrl: c.imageUrl,
          brandSlug: brandContext.slug,
          brandName: brandContext.name,
        }));
    } else {
      // Non-brand query: rank categories by how often they appear across hits.
      const freq = new Map<string, number>();
      for (const hit of result.hits) {
        for (const id of hit.categoryIds ?? []) {
          freq.set(id, (freq.get(id) ?? 0) + 1);
        }
      }

      if (freq.size > 0) {
        const topIds = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([id]) => id);

        const catRows = await prisma.category.findMany({
          where: { id: { in: topIds } },
          select: { id: true, slug: true, name: true, imageUrl: true },
        });
        const byId = new Map(catRows.map((c) => [c.id, c]));

        categories = topIds
          .map((id) => byId.get(id))
          .filter((c): c is CatRow & { id: string } => !!c)
          .slice(0, 4)
          .map((c) => ({
            slug: c.slug,
            name: c.name,
            imageUrl: c.imageUrl,
            brandSlug: null,
            brandName: null,
          }));
      }
    }

    return NextResponse.json({ products, brands, categories });
  } catch {
    return NextResponse.json(EMPTY);
  }
}
