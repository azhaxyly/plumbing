/**
 * tRPC router for admin category management.
 *
 * Provides CRUD operations for categories with tree-view support,
 * drag-and-drop reordering, and audit logging.
 *
 * Protected: only admin and manager roles.
 * See design.md → «Доменная модель» → Category, task 25.1.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { revalidateCategory } from "@/lib/revalidate";
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryNode {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  productsCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryNode[];
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(
  categories: Omit<CategoryNode, "children">[],
  parentId: string | null = null,
): CategoryNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      ...c,
      children: buildTree(categories, c.id),
    }));
}

// ─── Input schemas ────────────────────────────────────────────────────────────

const createCategoryInput = z.object({
  name: z.string().min(1, "Название обязательно").max(255),
  slug: z
    .string()
    .min(1, "Slug обязателен")
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug должен содержать только строчные буквы, цифры и дефисы",
    ),
  parentId: z.string().optional(),
  description: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
});

const updateCategoryInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  parentId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

const reorderInput = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      position: z.number().int().nonnegative(),
    }),
  ),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminCategoriesRouter = createTRPCRouter({
  /**
   * Get the full category tree (recursive, with children).
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);

    const prisma = await getPrisma();
    const categories = await prisma.category.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        parentId: true,
        slug: true,
        name: true,
        description: true,
        position: true,
        productsCount: true,
        seoTitle: true,
        seoDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return buildTree(categories);
  }),

  /**
   * Create a new category.
   */
  create: protectedProcedure
    .input(createCategoryInput)
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      // Check slug uniqueness
      const existing = await prisma.category.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Категория со slug "${input.slug}" уже существует`,
        });
      }

      // Validate parentId if provided
      if (input.parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: input.parentId },
        });
        if (!parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Родительская категория не найдена",
          });
        }
      }

      // Determine position if not provided
      const position =
        input.position ??
        (await prisma.category.count({
          where: { parentId: input.parentId ?? null },
        }));

      const category = await prisma.category.create({
        data: {
          name: input.name,
          slug: input.slug,
          parentId: input.parentId ?? null,
          description: input.description ?? null,
          position,
        },
      });

      await audit({
        actorUserId: ctx.userId,
        action: "create",
        entity: "Category",
        entityId: category.id,
        after: category,
      });

      await revalidateCategory(category.slug);

      return category;
    }),

  /**
   * Update an existing category.
   */
  update: protectedProcedure
    .input(updateCategoryInput)
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const before = await prisma.category.findUnique({
        where: { id: input.id },
      });
      if (!before) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Категория не найдена",
        });
      }

      // Check slug uniqueness if changing slug
      if (input.slug && input.slug !== before.slug) {
        const existing = await prisma.category.findUnique({
          where: { slug: input.slug },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Категория со slug "${input.slug}" уже существует`,
          });
        }
      }

      // Validate parentId if changing
      if (input.parentId !== undefined && input.parentId !== null) {
        if (input.parentId === input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Категория не может быть родителем самой себя",
          });
        }
        const parent = await prisma.category.findUnique({
          where: { id: input.parentId },
        });
        if (!parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Родительская категория не найдена",
          });
        }
      }

      const after = await prisma.category.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.parentId !== undefined
            ? { parentId: input.parentId }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.position !== undefined ? { position: input.position } : {}),
        },
      });

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Category",
        entityId: after.id,
        before,
        after,
      });

      // Revalidate both old and new slugs if slug changed
      await revalidateCategory(after.slug);
      if (before.slug !== after.slug) {
        await revalidateCategory(before.slug);
      }

      return after;
    }),

  /**
   * Delete a category.
   * Fails if the category has children or products.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const category = await prisma.category.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              children: true,
              products: true,
            },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Категория не найдена",
        });
      }

      if (category._count.children > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Нельзя удалить категорию: у неё есть ${category._count.children} дочерних категорий. Сначала удалите или переместите их.`,
        });
      }

      if (category._count.products > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Нельзя удалить категорию: в ней есть ${category._count.products} товаров. Сначала переместите или удалите их.`,
        });
      }

      await prisma.category.delete({ where: { id: input.id } });

      await audit({
        actorUserId: ctx.userId,
        action: "delete",
        entity: "Category",
        entityId: input.id,
        before: category,
      });

      await revalidateCategory(category.slug);

      return { success: true };
    }),

  /**
   * Reorder categories (for drag-and-drop / ↑↓ buttons).
   * Accepts an array of { id, position } pairs and updates them in a transaction.
   */
  reorder: protectedProcedure
    .input(reorderInput)
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      await prisma.$transaction(
        input.items.map(({ id, position }) =>
          prisma.category.update({
            where: { id },
            data: { position },
          }),
        ),
      );

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Category",
        entityId: "bulk-reorder",
        after: { reordered: input.items },
      });

      return { success: true };
    }),
});
