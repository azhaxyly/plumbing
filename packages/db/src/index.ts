/**
 * @timsan/db
 * Prisma client singleton + database utilities.
 *
 * IMPORTANT: The `../generated/client` directory is created by `prisma generate`.
 * Run `pnpm install` (which triggers the `postinstall` script) or
 * `pnpm --filter @timsan/db generate` before importing this package.
 */

export { prisma } from "./client";

export * from "../generated/client";

// Repository exports
export type { CategoryTreeNode } from "./repositories/category";
export {
  getCategoryTree,
  getCategoryBySlug,
  getCategoryBySlugPath,
  getAllCategoryPaths,
} from "./repositories/category";

export type { ProductFull } from "./repositories/product";
export { getProductBySlug } from "./repositories/product";

export type {
  BrandSummary,
  BrandProductItem,
  BrandWithProducts,
  BrandCategoryItem,
  BrandProductsOptions,
} from "./repositories/brand";
export {
  getAllBrands,
  getBrandBySlug,
  getBrandCategories,
  getBrandProductsPage,
} from "./repositories/brand";
