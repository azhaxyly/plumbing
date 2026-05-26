/**
 * tRPC router for admin coupon management.
 * Protected: only admin and manager roles.
 * See task 25.7.
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

const couponTypeSchema = z.enum(["percent", "fixed"]);

export const adminCouponsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();
    return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }),

  create: protectedProcedure
    .input(
      z.object({
        code: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[A-Z0-9_-]+$/, "Код должен содержать только заглавные буквы, цифры, _ и -")
          .transform((s) => s.toUpperCase()),
        type: couponTypeSchema,
        value: z
          .number()
          .int()
          .nonnegative()
          .refine((v) => v > 0, "Значение должно быть больше 0"),
        usageLimit: z.number().int().positive().nullable().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      if (input.type === "percent" && input.value > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Процент не может превышать 100" });
      }

      const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: `Купон с кодом "${input.code}" уже существует` });

      const coupon = await prisma.coupon.create({
        data: {
          code: input.code,
          type: input.type,
          value: input.value,
          usageLimit: input.usageLimit ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          isActive: input.isActive,
        },
      });
      await audit({ actorUserId: ctx.userId, action: "create", entity: "Coupon", entityId: coupon.id, after: coupon });
      return coupon;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        code: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[A-Z0-9_-]+$/)
          .transform((s) => s.toUpperCase())
          .optional(),
        type: couponTypeSchema.optional(),
        value: z.number().int().nonnegative().optional(),
        usageLimit: z.number().int().positive().nullable().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const before = await prisma.coupon.findUnique({ where: { id: input.id } });
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Купон не найден" });

      const effectiveType = input.type ?? before.type;
      const effectiveValue = input.value ?? before.value;
      if (effectiveType === "percent" && effectiveValue > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Процент не может превышать 100" });
      }

      if (input.code && input.code !== before.code) {
        const dup = await prisma.coupon.findUnique({ where: { code: input.code } });
        if (dup) throw new TRPCError({ code: "CONFLICT", message: `Купон с кодом "${input.code}" уже существует` });
      }

      const updateData: Record<string, unknown> = {};
      if (input.code !== undefined) updateData.code = input.code;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.value !== undefined) updateData.value = input.value;
      if (input.usageLimit !== undefined) updateData.usageLimit = input.usageLimit;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

      const after = await prisma.coupon.update({
        where: { id: input.id },
        data: updateData,
      });
      await audit({ actorUserId: ctx.userId, action: "update", entity: "Coupon", entityId: after.id, before, after });
      return after;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();
      const coupon = await prisma.coupon.findUnique({ where: { id: input.id } });
      if (!coupon) throw new TRPCError({ code: "NOT_FOUND", message: "Купон не найден" });
      await prisma.coupon.delete({ where: { id: input.id } });
      await audit({ actorUserId: ctx.userId, action: "delete", entity: "Coupon", entityId: input.id, before: coupon });
      return { success: true };
    }),
});
