import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/trpc";

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

export const favoritesRouter = createTRPCRouter({
  /** Returns all favorited product IDs for the current user. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const prisma = await getPrisma();
    const rows = await prisma.favorite.findMany({
      where: { userId: ctx.userId },
      select: { productId: true },
      orderBy: { createdAt: "desc" },
    });
    return { productIds: rows.map((r) => r.productId) };
  }),

  /** Toggle a product in/out of favorites. Returns the new state. */
  toggle: protectedProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const prisma = await getPrisma();
      const existing = await prisma.favorite.findUnique({
        where: { userId_productId: { userId: ctx.userId, productId: input.productId } },
      });
      if (existing) {
        await prisma.favorite.delete({ where: { id: existing.id } });
        return { isFavorite: false };
      }
      await prisma.favorite.create({
        data: { userId: ctx.userId, productId: input.productId },
      });
      return { isFavorite: true };
    }),

  /** Bulk-add product IDs to favorites (used to merge guest localStorage on login). */
  mergeGuest: protectedProcedure
    .input(z.object({ productIds: z.array(z.string()).max(200) }))
    .mutation(async ({ ctx, input }) => {
      if (input.productIds.length === 0) return;
      const prisma = await getPrisma();
      await prisma.favorite.createMany({
        data: input.productIds.map((productId) => ({ userId: ctx.userId, productId })),
        skipDuplicates: true,
      });
    }),

  /**
   * Fetch product card data for a list of product IDs.
   * Public — works for both guests (passing localStorage IDs) and auth users.
   */
  getProducts: publicProcedure
    .input(z.object({ productIds: z.array(z.string()).max(200) }))
    .mutation(async ({ input }) => {
      if (input.productIds.length === 0) return [];
      const prisma = await getPrisma();
      const products = await prisma.product.findMany({
        where: { id: { in: input.productIds }, status: "active" },
        select: {
          id: true,
          slug: true,
          name: true,
          priceCents: true,
          compareAtPriceCents: true,
          brand: { select: { name: true } },
          images: {
            select: { url: true, alt: true, isPrimary: true },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
          },
          variants: {
            select: { quantity: true, reserved: true },
          },
        },
      });
      return products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        compareAtPriceCents: p.compareAtPriceCents,
        brandName: p.brand?.name ?? null,
        primaryImageUrl: p.images[0]?.url ?? null,
        primaryImageAlt: p.images[0]?.alt ?? p.name,
        inStock: p.variants.some((v) => v.quantity - v.reserved > 0),
      }));
    }),
});
