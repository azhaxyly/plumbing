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

export const adminPromoSlidesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.promoSlide.findMany({ orderBy: { position: "asc" } });
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        imageUrl: z.string().url("Некорректный URL изображения"),
        linkUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
        position: z.number().int().nonnegative().default(0),
        isActive: z.boolean().default(true),
        startsAt: z.string().datetime().nullable().optional(),
        endsAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      return prisma.promoSlide.create({
        data: {
          title: input.title,
          imageUrl: input.imageUrl,
          linkUrl: input.linkUrl ?? null,
          position: input.position,
          isActive: input.isActive,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        title: z.string().min(1).max(255).optional(),
        imageUrl: z.string().url().optional(),
        linkUrl: z.string().nullable().optional(),
        position: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
        startsAt: z.string().datetime().nullable().optional(),
        endsAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      const { id, startsAt, endsAt, ...rest } = input;
      // Strip undefined values: exactOptionalPropertyTypes forbids explicit undefined
      // in Prisma update data (optional field must be absent, not undefined).
      const definedRest = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined),
      );
      return prisma.promoSlide.update({
        where: { id },
         
        data: {
          ...definedRest,
          ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
          ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      await prisma.promoSlide.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
