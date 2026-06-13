import { prisma } from "@timsan/db";
import { searchProducts } from "@timsan/search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const result = await searchProducts(
      q,
      { limit: 6, offset: 0, filter: 'status = "active"' },
      prisma,
    );

    const hits = result.hits.map((h) => ({
      id: h.id,
      slug: h.slug,
      name: h.name,
      brandName: h.brandName,
      priceCents: h.priceCents,
      primaryImageUrl: h.primaryImageUrl,
    }));

    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json({ hits: [] });
  }
}
