/**
 * tRPC router for admin CMS page management.
 * Protected: only admin and manager roles.
 * See task 25.5.
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

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug должен содержать только строчные буквы, цифры и дефисы");

export const adminPagesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.cmsPage.findMany({ orderBy: { updatedAt: "desc" } });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      const page = await prisma.cmsPage.findUnique({ where: { id: input.id } });
      if (!page) throw new TRPCError({ code: "NOT_FOUND", message: "Страница не найдена" });
      return page;
    }),

  create: protectedProcedure
    .input(
      z.object({
        slug: slugSchema,
        title: z.string().min(1).max(255),
        content: z.string().default(""),
        isPublished: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const existing = await prisma.cmsPage.findUnique({ where: { slug: input.slug } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: `Страница со slug "${input.slug}" уже существует` });

      const page = await prisma.cmsPage.create({ data: input });
      await audit({ actorUserId: ctx.userId, action: "create", entity: "Page", entityId: page.id, after: page });
      return page;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        slug: slugSchema.optional(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const before = await prisma.cmsPage.findUnique({ where: { id: input.id } });
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Страница не найдена" });

      if (input.slug && input.slug !== before.slug) {
        const dup = await prisma.cmsPage.findUnique({ where: { slug: input.slug } });
        if (dup) throw new TRPCError({ code: "CONFLICT", message: `Страница со slug "${input.slug}" уже существует` });
      }

      const updateData: Record<string, unknown> = {};
      if (input.slug !== undefined) updateData.slug = input.slug;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.isPublished !== undefined) updateData.isPublished = input.isPublished;

      const after = await prisma.cmsPage.update({ where: { id: input.id }, data: updateData });
      await audit({ actorUserId: ctx.userId, action: "update", entity: "Page", entityId: after.id, before, after });
      return after;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      const page = await prisma.cmsPage.findUnique({ where: { id: input.id } });
      if (!page) throw new TRPCError({ code: "NOT_FOUND", message: "Страница не найдена" });
      await prisma.cmsPage.delete({ where: { id: input.id } });
      await audit({ actorUserId: ctx.userId, action: "delete", entity: "Page", entityId: input.id, before: page });
      return { success: true };
    }),
});
