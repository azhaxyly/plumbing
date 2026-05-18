/**
 * POST /api/revalidate
 * On-demand ISR revalidation endpoint.
 * Called from admin mutations (Phase 5) after product/category/brand updates.
 *
 * Body: { type: 'product' | 'category' | 'brand', slug: string, secret: string }
 * Returns: { revalidated: true, path: string } on success
 * Returns 401 if secret is wrong, 400 if body is invalid
 */
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RevalidateBodySchema = z.object({
  type: z.enum(["product", "category", "brand"]),
  slug: z.string().min(1),
  secret: z.string().min(1),
});

type RevalidateBody = z.infer<typeof RevalidateBodySchema>;

function getRevalidationPaths(type: RevalidateBody["type"], slug: string): string[] {
  switch (type) {
    case "product":
      return [`/product/${slug}`];
    case "category":
      return [`/category/${slug}`, "/category"];
    case "brand":
      return [`/brand/${slug}`, "/brand"];
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = RevalidateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { type, slug, secret } = parsed.data;

  // Validate secret
  const expectedSecret = process.env["REVALIDATION_SECRET"];
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: "Invalid revalidation secret" },
      { status: 401 },
    );
  }

  // Revalidate the appropriate paths
  const paths = getRevalidationPaths(type, slug);
  for (const path of paths) {
    revalidatePath(path, "page");
  }

  const primaryPath = paths[0] ?? `/${type}/${slug}`;

  return NextResponse.json({ revalidated: true, path: primaryPath });
}
