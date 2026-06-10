/**
 * tRPC router for admin banner management.
 * Protected: only admin and manager roles.
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

const posterPositionSchema = z.enum(["left", "right", "none", "poster-only"]);

export const adminBannersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.banner.findMany({
      orderBy: { position: "asc" },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true } },
              },
            },
          },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        imageUrl: z.string().url("Некорректный URL изображения"),
        linkUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
        backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f5f5f4"),
        posterPosition: posterPositionSchema.default("left"),
        maxProducts: z.number().int().min(1).max(6).default(4),
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
          backgroundColor: input.backgroundColor,
          posterPosition: input.posterPosition,
          maxProducts: input.maxProducts,
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
        linkUrl: z.preprocess((v) => (v === "" ? null : v), z.string().min(1).nullable().optional()),
        backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        posterPosition: posterPositionSchema.optional(),
        maxProducts: z.number().int().min(1).max(6).optional(),
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
      if (input.backgroundColor !== undefined) updateData.backgroundColor = input.backgroundColor;
      if (input.posterPosition !== undefined) updateData.posterPosition = input.posterPosition;
      if (input.maxProducts !== undefined) updateData.maxProducts = input.maxProducts;
      if (input.position !== undefined) updateData.position = input.position;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.startsAt !== undefined) updateData.startsAt = input.startsAt ? new Date(input.startsAt) : null;
      if (input.endsAt !== undefined) updateData.endsAt = input.endsAt ? new Date(input.endsAt) : null;

      const after = await prisma.banner.update({ where: { id: input.id }, data: updateData });
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

  // ─── Product management ────────────────────────────────────────────────────

  addProduct: protectedProcedure
    .input(z.object({ bannerId: z.string().min(1), productId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const banner = await prisma.banner.findUnique({ where: { id: input.bannerId } });
      if (!banner) throw new TRPCError({ code: "NOT_FOUND", message: "Баннер не найден" });

      const maxPos = await prisma.bannerProduct.aggregate({
        where: { bannerId: input.bannerId },
        _max: { position: true },
      });
      const nextPosition = (maxPos._max.position ?? -1) + 1;

      return prisma.bannerProduct.upsert({
        where: { bannerId_productId: { bannerId: input.bannerId, productId: input.productId } },
        create: { bannerId: input.bannerId, productId: input.productId, position: nextPosition },
        update: {},
      });
    }),

  removeProduct: protectedProcedure
    .input(z.object({ bannerId: z.string().min(1), productId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      await prisma.bannerProduct.delete({
        where: { bannerId_productId: { bannerId: input.bannerId, productId: input.productId } },
      });
      return { success: true };
    }),

  reorderProducts: protectedProcedure
    .input(z.object({ bannerId: z.string().min(1), productIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      await prisma.$transaction(
        input.productIds.map((productId, index) =>
          prisma.bannerProduct.update({
            where: { bannerId_productId: { bannerId: input.bannerId, productId } },
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
