/**
 * tRPC router for admin banner management.
 * Protected: only admin and manager roles.
 * See task 25.6.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
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

export const adminBannersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.banner.findMany({ orderBy: { position: "asc" } });
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        imageUrl: z.string().url("Некорректный URL изображения"),
        linkUrl: z.string().url().optional(),
        position: z.number().int().nonnegative().default(0),
        isActive: z.boolean().default(true),
        startsAt: z.string().datetime().nullable().optional(),
        endsAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const banner = await prisma.banner.create({
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
      await audit({ actorUserId: ctx.userId, action: "create", entity: "Banner", entityId: banner.id, after: banner });
      return banner;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(255).optional(),
        imageUrl: z.string().url().optional(),
        linkUrl: z.string().url().nullable().optional(),
        position: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
        startsAt: z.string().datetime().nullable().optional(),
        endsAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const before = await prisma.banner.findUnique({ where: { id: input.id } });
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Баннер не найден" });

      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
      if (input.linkUrl !== undefined) updateData.linkUrl = input.linkUrl;
      if (input.position !== undefined) updateData.position = input.position;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.startsAt !== undefined) updateData.startsAt = input.startsAt ? new Date(input.startsAt) : null;
      if (input.endsAt !== undefined) updateData.endsAt = input.endsAt ? new Date(input.endsAt) : null;

      const after = await prisma.banner.update({
        where: { id: input.id },
        data: updateData,
      });
      await audit({ actorUserId: ctx.userId, action: "update", entity: "Banner", entityId: after.id, before, after });
      return after;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      const banner = await prisma.banner.findUnique({ where: { id: input.id } });
      if (!banner) throw new TRPCError({ code: "NOT_FOUND", message: "Баннер не найден" });
      await prisma.banner.delete({ where: { id: input.id } });
      await audit({ actorUserId: ctx.userId, action: "delete", entity: "Banner", entityId: input.id, before: banner });
      return { success: true };
    }),
});
