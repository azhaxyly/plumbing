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

export const adminReviewsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.review.findMany({ orderBy: { position: "asc" } });
  }),

  create: protectedProcedure
    .input(
      z.object({
        authorName: z.string().min(1).max(120),
        rating: z.number().int().min(1).max(5).default(5),
        text: z.string().min(1).max(2000),
        position: z.number().int().nonnegative().default(0),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      return prisma.review.create({
        data: {
          authorName: input.authorName,
          rating: input.rating,
          text: input.text,
          position: input.position,
          isActive: input.isActive,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        authorName: z.string().min(1).max(120).optional(),
        rating: z.number().int().min(1).max(5).optional(),
        text: z.string().min(1).max(2000).optional(),
        position: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      const { id, ...rest } = input;
      return prisma.review.update({ where: { id }, data: rest });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      await prisma.review.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
