/**
 * Category repository — tree queries via recursive CTE.
 */

import { prisma } from "../client";

/** Maximum depth for category tree traversal */
const MAX_DEPTH = 8;

export interface CategoryTreeNode {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  productsCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  depth: number;
  children: CategoryTreeNode[];
}

/** Flat row returned by the recursive CTE */
interface CategoryCteRow {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  productsCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  depth: number;
}

/**
 * Fetches the full category tree using a recursive CTE.
 * Depth is limited to MAX_DEPTH (8) levels.
 *
 * Returns a nested tree structure starting from root categories.
 */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const rows = await prisma.$queryRaw<CategoryCteRow[]>`
    WITH RECURSIVE category_tree AS (
      -- Base case: root categories (no parent)
      SELECT
        id,
        "parentId",
        slug,
        name,
        description,
        "imageUrl",
        position,
        "productsCount",
        "seoTitle",
        "seoDescription",
        "seoKeywords",
        0 AS depth
      FROM "Category"
      WHERE "parentId" IS NULL

      UNION ALL

      -- Recursive case: children up to MAX_DEPTH
      SELECT
        c.id,
        c."parentId",
        c.slug,
        c.name,
        c.description,
        c."imageUrl",
        c.position,
        c."productsCount",
        c."seoTitle",
        c."seoDescription",
        c."seoKeywords",
        ct.depth + 1 AS depth
      FROM "Category" c
      INNER JOIN category_tree ct ON c."parentId" = ct.id
      WHERE ct.depth < ${MAX_DEPTH}
    )
    SELECT * FROM category_tree
    ORDER BY depth ASC, position ASC, name ASC
  `;

  return buildTree(rows, null);
}

/**
 * Fetches a single category by slug, along with its ancestors (breadcrumb path)
 * and immediate children.
 */
export async function getCategoryBySlug(slug: string): Promise<{
  category: CategoryCteRow;
  ancestors: CategoryCteRow[];
  children: CategoryCteRow[];
} | null> {
  // Find the target category
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      parentId: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      position: true,
      productsCount: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
    },
  });

  if (!category) return null;

  // Fetch ancestors via recursive CTE (walk up the tree)
  const ancestors = await prisma.$queryRaw<CategoryCteRow[]>`
    WITH RECURSIVE ancestors AS (
      -- Base case: the parent of the target category
      SELECT
        id,
        "parentId",
        slug,
        name,
        description,
        "imageUrl",
        position,
        "productsCount",
        "seoTitle",
        "seoDescription",
        "seoKeywords",
        0 AS depth
      FROM "Category"
      WHERE id = ${category.parentId}

      UNION ALL

      -- Recursive case: walk up
      SELECT
        c.id,
        c."parentId",
        c.slug,
        c.name,
        c.description,
        c."imageUrl",
        c.position,
        c."productsCount",
        c."seoTitle",
        c."seoDescription",
        c."seoKeywords",
        a.depth + 1 AS depth
      FROM "Category" c
      INNER JOIN ancestors a ON c.id = a."parentId"
      WHERE a.depth < ${MAX_DEPTH}
    )
    SELECT * FROM ancestors
    ORDER BY depth DESC
  `;

  // Fetch immediate children
  const children = await prisma.$queryRaw<CategoryCteRow[]>`
    SELECT
      id,
      "parentId",
      slug,
      name,
      description,
      "imageUrl",
      position,
      "productsCount",
      "seoTitle",
      "seoDescription",
      "seoKeywords",
      1 AS depth
    FROM "Category"
    WHERE "parentId" = ${category.id}
    ORDER BY position ASC, name ASC
  `;

  return {
    category: { ...category, depth: 0 },
    ancestors,
    children,
  };
}

/**
 * Fetches a category by its slug path array (e.g. ["bathtubs", "acrylic-bathtubs"]).
 *
 * Only the leaf slug is used to locate the category; the canonical path is then
 * derived from the category's real ancestors (root→leaf). The caller is expected
 * to compare the requested path against `canonicalPath` and 308-redirect when they
 * differ, instead of 404-ing — this collapses duplicate URLs (`/category/child`
 * and any wrong-ancestor path) onto the single canonical full path.
 *
 * Returns `null` only when the leaf slug does not exist at all.
 */
export async function getCategoryBySlugPath(slugPath: string[]): Promise<{
  category: CategoryCteRow;
  ancestors: CategoryCteRow[];
  children: CategoryCteRow[];
  canonicalPath: string[];
} | null> {
  if (slugPath.length === 0) return null;

  // The leaf slug is the last element
  const leafSlug = slugPath[slugPath.length - 1];
  if (!leafSlug) return null;

  const result = await getCategoryBySlug(leafSlug);
  if (!result) return null;

  // Canonical full path: ancestors are returned root→leaf, leaf last.
  const canonicalPath = [...result.ancestors.map((a) => a.slug), result.category.slug];

  return { ...result, canonicalPath };
}

/**
 * Returns every category as a canonical full slug path (root→leaf) with its
 * `updatedAt`, in a single query. Used by the sitemap so each category is listed
 * once, at its canonical URL.
 */
export async function getAllCategoryPaths(): Promise<{ path: string; updatedAt: Date }[]> {
  const rows = await prisma.category.findMany({
    select: { id: true, slug: true, parentId: true, updatedAt: true },
  });

  const byId = new Map(rows.map((r) => [r.id, r]));

  function buildPath(id: string): string[] {
    const node = byId.get(id);
    if (!node) return [];
    if (!node.parentId) return [node.slug];
    return [...buildPath(node.parentId), node.slug];
  }

  return rows.map((r) => ({
    path: buildPath(r.id).join("/"),
    updatedAt: r.updatedAt,
  }));
}

/** Recursively builds a nested tree from a flat list of CTE rows */
function buildTree(rows: CategoryCteRow[], parentId: string | null): CategoryTreeNode[] {
  return rows
    .filter((row) => row.parentId === parentId)
    .map((row) => ({
      ...row,
      children: buildTree(rows, row.id),
    }));
}
