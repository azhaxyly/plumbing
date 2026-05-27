import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

function requireAdminOrManager(role: string | null): void {
  if (role !== "admin" && role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Требуется роль admin или manager" });
  }
}

export const adminBestsellersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.bestsellerItem.findMany({
      orderBy: { position: "asc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceCents: true,
            images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
          },
        },
      },
    });
  }),

  addProduct: protectedProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const maxPos = await prisma.bestsellerItem.aggregate({
        _max: { position: true },
      });
      const nextPosition = (maxPos._max.position ?? -1) + 1;

      return prisma.bestsellerItem.upsert({
        where: { productId: input.productId },
        create: { productId: input.productId, position: nextPosition },
        update: {},
      });
    }),

  removeProduct: protectedProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      await prisma.bestsellerItem.delete({ where: { productId: input.productId } });
      return { success: true };
    }),

  reorderProducts: protectedProcedure
    .input(z.object({ productIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      await prisma.$transaction(
        input.productIds.map((productId, index) =>
          prisma.bestsellerItem.update({
            where: { productId },
            data: { position: index },
          }),
        ),
      );
      return { success: true };
    }),

  searchProducts: protectedProcedure
    .input(z.object({ q: z.string() }))
    .query(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      return prisma.product.findMany({
        where: {
          status: "active",
          name: { contains: input.q, mode: "insensitive" },
        },
        take: 20,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          priceCents: true,
          slug: true,
          images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
        },
      });
    }),
});
