/**
 * tRPC router for admin brand management.
 *
 * Provides CRUD operations for brands with logo upload support.
 * Protected: only admin and manager roles.
 * See design.md → «Доменная модель» → Brand, task 25.2.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { revalidateBrand } from "@/lib/revalidate";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

/** Require admin or manager role, throw FORBIDDEN otherwise. */
function requireAdminOrManager(role: string | null): void {
  if (role !== "admin" && role !== "manager") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Требуется роль admin или manager",
    });
  }
}

// ─── Input schemas ────────────────────────────────────────────────────────────

const createBrandInput = z.object({
  name: z.string().min(1, "Название обязательно").max(255),
  slug: z
    .string()
    .min(1, "Slug обязателен")
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug должен содержать только строчные буквы, цифры и дефисы",
    ),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

const updateBrandInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminBrandsRouter = createTRPCRouter({
  /**
   * Get the full list of brands with product count.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);

    const prisma = await getPrisma();
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return brands;
  }),

  /**
   * Create a new brand.
   */
  create: protectedProcedure
    .input(createBrandInput)
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      // Check slug uniqueness
      const existing = await prisma.brand.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Бренд со slug "${input.slug}" уже существует`,
        });
      }

      const brand = await prisma.brand.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
        },
      });

      await audit({
        actorUserId: ctx.userId,
        action: "create",
        entity: "Brand",
        entityId: brand.id,
        after: brand,
      });

      await revalidateBrand(brand.slug);

      return brand;
    }),

  /**
   * Update an existing brand.
   */
  update: protectedProcedure
    .input(updateBrandInput)
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const before = await prisma.brand.findUnique({
        where: { id: input.id },
      });
      if (!before) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Бренд не найден",
        });
      }

      // Check slug uniqueness if changing slug
      if (input.slug && input.slug !== before.slug) {
        const existing = await prisma.brand.findUnique({
          where: { slug: input.slug },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Бренд со slug "${input.slug}" уже существует`,
          });
        }
      }

      const after = await prisma.brand.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        },
      });

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Brand",
        entityId: after.id,
        before,
        after,
      });

      // Revalidate both old and new slugs if slug changed
      await revalidateBrand(after.slug);
      if (before.slug !== after.slug) {
        await revalidateBrand(before.slug);
      }

      return after;
    }),

  /**
   * Delete a brand.
   * Fails if the brand has products.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const brand = await prisma.brand.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Бренд не найден",
        });
      }

      if (brand._count.products > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Нельзя удалить бренд: у него есть ${brand._count.products} товаров. Сначала переместите или удалите их.`,
        });
      }

      await prisma.brand.delete({ where: { id: input.id } });

      await audit({
        actorUserId: ctx.userId,
        action: "delete",
        entity: "Brand",
        entityId: input.id,
        before: brand,
      });

      await revalidateBrand(brand.slug);

      return { success: true };
    }),
});
