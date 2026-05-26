/**
 * tRPC router for admin attribute & attribute-value management.
 * Protected: only admin and manager roles.
 * See task 25.4.
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

export const adminAttributesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.attribute.findMany({
      orderBy: { name: "asc" },
      include: {
        values: { orderBy: { value: "asc" } },
        _count: { select: { products: true } },
      },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255), slug: slugSchema }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const existing = await prisma.attribute.findFirst({
        where: { OR: [{ name: input.name }, { slug: input.slug }] },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Атрибут с таким именем или slug уже существует" });
      }

      const attr = await prisma.attribute.create({ data: { name: input.name, slug: input.slug } });
      await audit({ actorUserId: ctx.userId, action: "create", entity: "Attribute", entityId: attr.id, after: attr });
      return attr;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().min(1), name: z.string().min(1).max(255).optional(), slug: slugSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const before = await prisma.attribute.findUnique({ where: { id: input.id } });
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Атрибут не найден" });

      if (input.name && input.name !== before.name) {
        const dup = await prisma.attribute.findUnique({ where: { name: input.name } });
        if (dup) throw new TRPCError({ code: "CONFLICT", message: "Атрибут с таким именем уже существует" });
      }
      if (input.slug && input.slug !== before.slug) {
        const dup = await prisma.attribute.findUnique({ where: { slug: input.slug } });
        if (dup) throw new TRPCError({ code: "CONFLICT", message: "Атрибут с таким slug уже существует" });
      }

      const after = await prisma.attribute.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
        },
      });
      await audit({ actorUserId: ctx.userId, action: "update", entity: "Attribute", entityId: after.id, before, after });
      return after;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const attr = await prisma.attribute.findUnique({
        where: { id: input.id },
        include: { _count: { select: { products: true } } },
      });
      if (!attr) throw new TRPCError({ code: "NOT_FOUND", message: "Атрибут не найден" });
      if (attr._count.products > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Нельзя удалить атрибут: он используется в ${attr._count.products} товарах`,
        });
      }

      await prisma.attribute.delete({ where: { id: input.id } });
      await audit({ actorUserId: ctx.userId, action: "delete", entity: "Attribute", entityId: input.id, before: attr });
      return { success: true };
    }),

  // ── Attribute Values ──────────────────────────────────────────────────────────

  createValue: protectedProcedure
    .input(z.object({ attributeId: z.string().min(1), value: z.string().min(1).max(255), slug: slugSchema }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const attr = await prisma.attribute.findUnique({ where: { id: input.attributeId } });
      if (!attr) throw new TRPCError({ code: "NOT_FOUND", message: "Атрибут не найден" });

      const dup = await prisma.attributeValue.findUnique({
        where: { attributeId_slug: { attributeId: input.attributeId, slug: input.slug } },
      });
      if (dup) throw new TRPCError({ code: "CONFLICT", message: "Значение с таким slug уже существует" });

      const val = await prisma.attributeValue.create({
        data: { attributeId: input.attributeId, value: input.value, slug: input.slug },
      });
      await audit({ actorUserId: ctx.userId, action: "create", entity: "AttributeValue", entityId: val.id, after: val });
      return val;
    }),

  updateValue: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        value: z.string().min(1).max(255).optional(),
        slug: slugSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const before = await prisma.attributeValue.findUnique({ where: { id: input.id } });
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Значение не найдено" });

      if (input.slug && input.slug !== before.slug) {
        const dup = await prisma.attributeValue.findUnique({
          where: { attributeId_slug: { attributeId: before.attributeId, slug: input.slug } },
        });
        if (dup) throw new TRPCError({ code: "CONFLICT", message: "Значение с таким slug уже существует" });
      }

      const after = await prisma.attributeValue.update({
        where: { id: input.id },
        data: {
          ...(input.value !== undefined ? { value: input.value } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
        },
      });
      await audit({ actorUserId: ctx.userId, action: "update", entity: "AttributeValue", entityId: after.id, before, after });
      return after;
    }),

  deleteValue: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const val = await prisma.attributeValue.findUnique({ where: { id: input.id } });
      if (!val) throw new TRPCError({ code: "NOT_FOUND", message: "Значение не найдено" });

      await prisma.attributeValue.delete({ where: { id: input.id } });
      await audit({ actorUserId: ctx.userId, action: "delete", entity: "AttributeValue", entityId: input.id, before: val });
      return { success: true };
    }),
});
