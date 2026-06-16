/**
 * Root tRPC router.
 * Combines all sub-routers into a single app router.
 */

import { adminAttributesRouter } from "@/server/routers/admin-attributes";
import { adminBannersRouter } from "@/server/routers/admin-banners";
import { adminBestsellersRouter } from "@/server/routers/admin-bestsellers";
import { adminBrandsRouter } from "@/server/routers/admin-brands";
import { adminCategoriesRouter } from "@/server/routers/admin-categories";
import { adminCouponsRouter } from "@/server/routers/admin-coupons";
import { adminPagesRouter } from "@/server/routers/admin-pages";
import { adminProductsRouter } from "@/server/routers/admin-products";
import { adminPromoSlidesRouter } from "@/server/routers/admin-promo-slides";
import { adminReviewsRouter } from "@/server/routers/admin-reviews";
import { cartRouter } from "@/server/routers/cart";
import { favoritesRouter } from "@/server/routers/favorites";
import { createTRPCRouter } from "@/server/trpc";

export const appRouter = createTRPCRouter({
  cart: cartRouter,
  favorites: favoritesRouter,
  adminCategories: adminCategoriesRouter,
  adminBrands: adminBrandsRouter,
  adminProducts: adminProductsRouter,
  adminAttributes: adminAttributesRouter,
  adminPages: adminPagesRouter,
  adminBanners: adminBannersRouter,
  adminCoupons: adminCouponsRouter,
  adminBestsellers: adminBestsellersRouter,
  adminPromoSlides: adminPromoSlidesRouter,
  adminReviews: adminReviewsRouter,
});

export type AppRouter = typeof appRouter;
