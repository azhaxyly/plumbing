/**
 * tRPC router for admin product management.
 *
 * Provides full CRUD for products, variants, images, categories, and attributes.
 * Protected: only admin and manager roles.
 * See design.md → «Доменная модель» → Product, task 25.3.
 */

import { TRPCError } from "@trpc/server";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { revalidateProduct } from "@/lib/revalidate";
import { parseStockFile } from "@/lib/stock-sync-parser";
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

let _searchQueue: Queue | null = null;

function getSearchQueue(): Queue {
  if (!_searchQueue) {
    const connection = new IORedis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    _searchQueue = new Queue("search-indexing", { connection });
  }
  return _searchQueue;
}

function indexProduct(productId: string, action: "upsert" | "delete" = "upsert"): void {
  getSearchQueue()
    .add("index-product", { productId, action })
    .catch((err) => console.error(`[indexProduct] Failed to enqueue ${productId}:`, err));
}

/**
 * Brands whose absence from the 1C price report does NOT mean "out of stock":
 * the report itself excludes GROHE DIY / GROHE Леруа Мерлен / IVA / Hansgrohe
 * and the VITRA / ЭЛНА / ИНКОПЛАСТ / ORBITA groups. The DB has a single "Grohe"
 * brand that cannot be split into excluded/included parts, so all of Grohe is
 * kept out of the "нет в файле" list. Lower-cased brand names.
 */
const STOCK_SYNC_EXCLUDED_BRANDS = new Set(["grohe", "hansgrohe", "iva", "vitra", "orbita"]);

// ─── Input schemas ────────────────────────────────────────────────────────────

const productStatusSchema = z.enum(["active", "draft", "archived"]);

const createProductInput = z.object({
  name: z.string().min(1, "Название обязательно").max(500),
  slug: z.string().min(1, "Slug обязателен").max(255),
  sku: z.string().min(1, "SKU обязателен").max(255),
  brandId: z.string().min(1, "Бренд обязателен"),
  status: productStatusSchema.default("draft"),
  priceCents: z.number().int().nonnegative("Цена не может быть отрицательной"),
  compareAtPriceCents: z.number().int().nonnegative().nullable().optional(),
  shortDescription: z.string().max(1000).optional(),
  description: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  seoKeywords: z.string().max(500).optional(),
});

const updateProductInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(255).optional(),
  brandId: z.string().min(1).optional(),
  status: productStatusSchema.optional(),
  priceCents: z.number().int().nonnegative().optional(),
  compareAtPriceCents: z.number().int().nonnegative().nullable().optional(),
  shortDescription: z.string().max(1000).nullable().optional(),
  description: z.string().nullable().optional(),
  seoTitle: z.string().max(255).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  seoKeywords: z.string().max(500).nullable().optional(),
});

const upsertVariantInput = z.object({
  productId: z.string().min(1),
  id: z.string().optional(), // if provided → update, else → create
  sku: z.string().min(1, "SKU варианта обязателен").max(255),
  priceCents: z.number().int().nonnegative(),
  quantity: z.number().int().nonnegative().default(0),
  attributes: z.record(z.string()).default({}),
});

const upsertImageInput = z.object({
  productId: z.string().min(1),
  id: z.string().optional(),
  url: z.string().url("Некорректный URL изображения"),
  alt: z.string().max(255).default(""),
  position: z.number().int().nonnegative().default(0),
  isPrimary: z.boolean().default(false),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminProductsRouter = createTRPCRouter({
  /**
   * List products with pagination and filters.
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        search: z.string().optional(),
        status: productStatusSchema.optional(),
        brandId: z.string().optional(),
        categoryId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();
      const { page, limit, search, status, brandId, categoryId } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { sku: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(brandId ? { brandId } : {}),
        ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      };

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            name: true,
            sku: true,
            status: true,
            priceCents: true,
            compareAtPriceCents: true,
            createdAt: true,
            updatedAt: true,
            brand: {
              select: { id: true, name: true, slug: true },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true, alt: true },
            },
            _count: {
              select: { variants: true },
            },
          },
        }),
      ]);

      return {
        items: products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get full product card (with variants, images, attributes, categories).
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const product = await prisma.product.findUnique({
        where: { id: input.id },
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            orderBy: { createdAt: "asc" },
          },
          images: {
            orderBy: { position: "asc" },
          },
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          productAttributes: {
            include: {
              attribute: { select: { id: true, name: true, slug: true } },
              attributeValue: { select: { id: true, value: true, slug: true } },
            },
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Товар не найден",
        });
      }

      return product;
    }),

  /**
   * Create a new product.
   */
  create: protectedProcedure.input(createProductInput).mutation(async ({ ctx, input }) => {
    requireAdminOrManager(ctx.userRole);

    const prisma = await getPrisma();

    // Check slug uniqueness
    const existingSlug = await prisma.product.findUnique({
      where: { slug: input.slug },
    });
    if (existingSlug) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Товар со slug "${input.slug}" уже существует`,
      });
    }

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: input.sku },
    });
    if (existingSku) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Товар с SKU "${input.sku}" уже существует`,
      });
    }

    // Validate brand
    const brand = await prisma.brand.findUnique({
      where: { id: input.brandId },
    });
    if (!brand) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Бренд не найден",
      });
    }

    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        brandId: input.brandId,
        status: input.status,
        priceCents: input.priceCents,
        compareAtPriceCents: input.compareAtPriceCents ?? null,
        shortDescription: input.shortDescription ?? null,
        description: input.description ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        seoKeywords: input.seoKeywords ?? null,
      },
    });

    await audit({
      actorUserId: ctx.userId,
      action: "create",
      entity: "Product",
      entityId: product.id,
      after: product,
    });

    await revalidateProduct(product.slug);
    indexProduct(product.id);

    return product;
  }),

  /**
   * Update an existing product.
   */
  update: protectedProcedure.input(updateProductInput).mutation(async ({ ctx, input }) => {
    requireAdminOrManager(ctx.userRole);

    const prisma = await getPrisma();

    const before = await prisma.product.findUnique({
      where: { id: input.id },
    });
    if (!before) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Товар не найден",
      });
    }

    // Check slug uniqueness if changing
    if (input.slug && input.slug !== before.slug) {
      const existing = await prisma.product.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Товар со slug "${input.slug}" уже существует`,
        });
      }
    }

    // Check SKU uniqueness if changing
    if (input.sku && input.sku !== before.sku) {
      const existing = await prisma.product.findUnique({
        where: { sku: input.sku },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Товар с SKU "${input.sku}" уже существует`,
        });
      }
    }

    // Validate brand if changing
    if (input.brandId && input.brandId !== before.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: input.brandId },
      });
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Бренд не найден",
        });
      }
    }

    const after = await prisma.product.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
        ...(input.compareAtPriceCents !== undefined
          ? { compareAtPriceCents: input.compareAtPriceCents }
          : {}),
        ...(input.shortDescription !== undefined
          ? { shortDescription: input.shortDescription }
          : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
        ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
        ...(input.seoKeywords !== undefined ? { seoKeywords: input.seoKeywords } : {}),
      },
    });

    await audit({
      actorUserId: ctx.userId,
      action: "update",
      entity: "Product",
      entityId: after.id,
      before,
      after,
    });

    await revalidateProduct(after.slug);
    if (before.slug !== after.slug) {
      await revalidateProduct(before.slug);
    }
    indexProduct(after.id);

    return after;
  }),

  /**
   * Delete a product.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const product = await prisma.product.findUnique({
        where: { id: input.id },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Товар не найден",
        });
      }

      await prisma.product.delete({ where: { id: input.id } });

      await audit({
        actorUserId: ctx.userId,
        action: "delete",
        entity: "Product",
        entityId: input.id,
        before: product,
      });

      await revalidateProduct(product.slug);
      indexProduct(product.id, "delete");

      return { success: true };
    }),

  /**
   * Add or update a product variant.
   */
  upsertVariant: protectedProcedure.input(upsertVariantInput).mutation(async ({ ctx, input }) => {
    requireAdminOrManager(ctx.userRole);

    const prisma = await getPrisma();

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Товар не найден",
      });
    }

    let variant;
    if (input.id) {
      // Update existing variant
      const before = await prisma.productVariant.findUnique({
        where: { id: input.id },
      });
      if (!before) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Вариант не найден",
        });
      }

      // Check SKU uniqueness if changing
      if (input.sku !== before.sku) {
        const existing = await prisma.productVariant.findUnique({
          where: { sku: input.sku },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Вариант с SKU "${input.sku}" уже существует`,
          });
        }
      }

      variant = await prisma.productVariant.update({
        where: { id: input.id },
        data: {
          sku: input.sku,
          priceCents: input.priceCents,
          quantity: input.quantity,
          attributes: input.attributes,
        },
      });

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Product",
        entityId: input.productId,
        before,
        after: variant,
      });
    } else {
      // Create new variant — check SKU uniqueness
      const existing = await prisma.productVariant.findUnique({
        where: { sku: input.sku },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Вариант с SKU "${input.sku}" уже существует`,
        });
      }

      variant = await prisma.productVariant.create({
        data: {
          productId: input.productId,
          sku: input.sku,
          priceCents: input.priceCents,
          quantity: input.quantity,
          attributes: input.attributes,
        },
      });

      await audit({
        actorUserId: ctx.userId,
        action: "create",
        entity: "Product",
        entityId: input.productId,
        after: variant,
      });
    }

    indexProduct(input.productId);

    return variant;
  }),

  /**
   * Delete a product variant.
   */
  deleteVariant: protectedProcedure
    .input(z.object({ variantId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const variant = await prisma.productVariant.findUnique({
        where: { id: input.variantId },
      });
      if (!variant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Вариант не найден",
        });
      }

      await prisma.productVariant.delete({ where: { id: input.variantId } });

      await audit({
        actorUserId: ctx.userId,
        action: "delete",
        entity: "Product",
        entityId: variant.productId,
        before: variant,
      });

      indexProduct(variant.productId);

      return { success: true };
    }),

  /**
   * Add or update a product image.
   */
  upsertImage: protectedProcedure.input(upsertImageInput).mutation(async ({ ctx, input }) => {
    requireAdminOrManager(ctx.userRole);

    const prisma = await getPrisma();

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Товар не найден",
      });
    }

    let image;
    if (input.id) {
      const before = await prisma.productImage.findUnique({
        where: { id: input.id },
      });
      if (!before) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Изображение не найдено",
        });
      }

      image = await prisma.productImage.update({
        where: { id: input.id },
        data: {
          url: input.url,
          alt: input.alt,
          position: input.position,
          isPrimary: input.isPrimary,
        },
      });
    } else {
      // If this is primary, unset other primary images
      if (input.isPrimary) {
        await prisma.productImage.updateMany({
          where: { productId: input.productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      image = await prisma.productImage.create({
        data: {
          productId: input.productId,
          url: input.url,
          alt: input.alt,
          position: input.position,
          isPrimary: input.isPrimary,
        },
      });
    }

    await audit({
      actorUserId: ctx.userId,
      action: input.id ? "update" : "create",
      entity: "Product",
      entityId: input.productId,
      after: image,
    });

    await revalidateProduct(product.slug);
    indexProduct(input.productId);

    return image;
  }),

  /**
   * Delete a product image.
   */
  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const image = await prisma.productImage.findUnique({
        where: { id: input.imageId },
        include: { product: { select: { slug: true } } },
      });
      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Изображение не найдено",
        });
      }

      await prisma.productImage.delete({ where: { id: input.imageId } });

      await audit({
        actorUserId: ctx.userId,
        action: "delete",
        entity: "Product",
        entityId: image.productId,
        before: image,
      });

      await revalidateProduct(image.product.slug);
      indexProduct(image.productId);

      return { success: true };
    }),

  /**
   * Set categories for a product (replaces all existing).
   */
  setCategories: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        categoryIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const product = await prisma.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Товар не найден",
        });
      }

      // Replace all categories in a transaction
      await prisma.$transaction([
        prisma.productCategory.deleteMany({
          where: { productId: input.productId },
        }),
        ...(input.categoryIds.length > 0
          ? [
              prisma.productCategory.createMany({
                data: input.categoryIds.map((categoryId) => ({
                  productId: input.productId,
                  categoryId,
                })),
              }),
            ]
          : []),
      ]);

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Product",
        entityId: input.productId,
        after: { categories: input.categoryIds },
      });

      await revalidateProduct(product.slug);
      indexProduct(input.productId);

      return { success: true };
    }),

  /**
   * List all attributes with their values (for the product form selects).
   */
  listAttributes: protectedProcedure.query(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);

    const prisma = await getPrisma();
    const attributes = await prisma.attribute.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        values: {
          orderBy: { value: "asc" },
          select: { id: true, value: true, slug: true },
        },
      },
    });

    return attributes;
  }),

  /**
   * Set attributes for a product (replaces all existing).
   */
  setAttributes: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        attributes: z.array(
          z.object({
            attributeId: z.string().min(1),
            attributeValueId: z.string().min(1),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdminOrManager(ctx.userRole);

      const prisma = await getPrisma();

      const product = await prisma.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Товар не найден",
        });
      }

      // Replace all attributes in a transaction
      await prisma.$transaction([
        prisma.productAttribute.deleteMany({
          where: { productId: input.productId },
        }),
        ...(input.attributes.length > 0
          ? [
              prisma.productAttribute.createMany({
                data: input.attributes.map((attr) => ({
                  productId: input.productId,
                  attributeId: attr.attributeId,
                  attributeValueId: attr.attributeValueId,
                })),
              }),
            ]
          : []),
      ]);

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Product",
        entityId: input.productId,
        after: { attributes: input.attributes },
      });

      await revalidateProduct(product.slug);
      indexProduct(input.productId);

      return { success: true };
    }),

  // ─── Stock sync ──────────────────────────────────────────────────────────────

  previewStockSync: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        quantityForMore: z.number().int().min(1).default(20),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const buffer = Buffer.from(input.fileBase64, "base64");
      const parsed = parseStockFile(buffer, input.fileName);

      // Collapse duplicate articles (last row wins); flag rows whose duplicates
      // disagreed on the retail price so the admin can double-check them.
      const byArticle = new Map<string, (typeof parsed)[number]>();
      const priceConflicts = new Set<string>();
      for (const row of parsed) {
        const key = row.article.toLowerCase();
        const prev = byArticle.get(key);
        if (
          prev &&
          prev.retailPriceCents !== null &&
          row.retailPriceCents !== null &&
          prev.retailPriceCents !== row.retailPriceCents
        ) {
          priceConflicts.add(key);
        }
        byArticle.set(key, row);
      }
      const rows = [...byArticle.values()];

      // Load all products once and match in memory — much faster than N queries
      const allProducts = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          priceCents: true,
          brand: { select: { name: true } },
          variants: { select: { quantity: true } },
        },
      });

      const bySkuLower = new Map<string, (typeof allProducts)[number]>();
      for (const p of allProducts) {
        bySkuLower.set(p.sku.toLowerCase(), p);
      }

      const matchedProductIds = new Set<string>();

      const results = rows.map((row) => {
        const quantity = row.quantity !== null ? row.quantity : input.quantityForMore;
        const articleLower = row.article.toLowerCase();

        // Pass 1: exact SKU match
        const bySkuMatch = bySkuLower.get(articleLower);
        if (bySkuMatch) {
          matchedProductIds.add(bySkuMatch.id);
          return {
            article: row.article,
            brand: row.brand,
            quantity,
            newPriceCents: row.retailPriceCents,
            currentPriceCents: bySkuMatch.priceCents,
            priceConflict: priceConflicts.has(articleLower),
            matchSource: "sku" as const,
            products: [{ id: bySkuMatch.id, name: bySkuMatch.name, sku: bySkuMatch.sku }],
          };
        }

        // Pass 2: article appears in product name as a whole token
        // e.g. "A39" matches "Alcaplast A39 1 1/4" but NOT "A392C" or "A390"
        const escaped = articleLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const tokenRe = new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, "i");
        const byNameMatches = allProducts.filter((p) => tokenRe.test(p.name));
        for (const p of byNameMatches) matchedProductIds.add(p.id);
        return {
          article: row.article,
          brand: row.brand,
          quantity,
          newPriceCents: row.retailPriceCents,
          currentPriceCents: byNameMatches[0]?.priceCents ?? null,
          priceConflict: priceConflicts.has(articleLower),
          matchSource: byNameMatches.length > 0 ? ("name" as const) : ("not_found" as const),
          products: byNameMatches.map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
        };
      });

      // Active products that the uploaded file does not mention at all.
      // The 1C report excludes some brands/groups entirely (Grohe DIY, Hansgrohe,
      // IVA, VITRA, ORBITA, …) — for those, absence from the file does NOT mean
      // "out of stock", so they are excluded from this list.
      const notInFile = allProducts
        .filter(
          (p) =>
            p.status === "active" &&
            !matchedProductIds.has(p.id) &&
            !STOCK_SYNC_EXCLUDED_BRANDS.has(p.brand.name.toLowerCase()),
        )
        .map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand.name,
          priceCents: p.priceCents,
          totalQuantity: p.variants.reduce((sum, v) => sum + v.quantity, 0),
        }));

      return {
        rows: results,
        notInFile,
        excludedBrands: [...STOCK_SYNC_EXCLUDED_BRANDS],
      };
    }),

  applyStockSync: protectedProcedure
    .input(
      z.object({
        // Each entry: article from CSV + resolved quantity (already has quantityForMore applied)
        rows: z.array(
          z.object({
            article: z.string().min(1),
            quantity: z.number().int().min(0),
            priceCents: z.number().int().positive().nullable().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      // Re-fetch products to get fresh IDs (same logic as previewStockSync)
      const allProducts = await prisma.product.findMany({
        select: { id: true, name: true, sku: true, slug: true, priceCents: true },
      });

      const bySkuLower = new Map<string, (typeof allProducts)[number]>();
      for (const p of allProducts) {
        bySkuLower.set(p.sku.toLowerCase(), p);
      }

      let updated = 0;
      let pricesUpdated = 0;
      let skipped = 0;

      for (const row of input.rows) {
        const articleLower = row.article.toLowerCase();

        // Pass 1: by SKU
        let product = bySkuLower.get(articleLower);

        // Pass 2: by name token
        if (!product) {
          const escaped = articleLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const tokenRe = new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, "i");
          product = allProducts.find((p) => tokenRe.test(p.name));
        }

        if (!product) {
          skipped++;
          continue;
        }

        const result = await prisma.productVariant.updateMany({
          where: { productId: product.id },
          data: { quantity: row.quantity },
        });

        if (result.count > 0) updated += result.count;
        else skipped++;

        const priceCents = row.priceCents ?? null;
        if (priceCents !== null && priceCents !== product.priceCents) {
          await prisma.product.update({
            where: { id: product.id },
            data: { priceCents, compareAtPriceCents: null },
          });
          await prisma.productVariant.updateMany({
            where: { productId: product.id },
            data: { priceCents },
          });
          pricesUpdated++;
          indexProduct(product.id);
          await revalidateProduct(product.slug);
        }
      }

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Product",
        entityId: "stock-sync",
        after: { fileRows: input.rows.length, updated, pricesUpdated, skipped },
      });

      return { updated, pricesUpdated, skipped };
    }),

  /**
   * Zero out stock for the given products. Used from the stock-sync page for
   * products that are absent from the uploaded 1C report ("нет в файле").
   * Never touches product status — the product stays visible as "нет в наличии".
   */
  zeroStock: protectedProcedure
    .input(z.object({ productIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ input, ctx }) => {
      requireAdminOrManager(ctx.userRole);
      const prisma = await getPrisma();

      const result = await prisma.productVariant.updateMany({
        where: { productId: { in: input.productIds } },
        data: { quantity: 0 },
      });

      for (const id of input.productIds) indexProduct(id);

      await audit({
        actorUserId: ctx.userId,
        action: "update",
        entity: "Product",
        entityId: "stock-sync-zero",
        after: { productIds: input.productIds, variantsZeroed: result.count },
      });

      return { variantsZeroed: result.count };
    }),

  reindexAll: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdminOrManager(ctx.userRole);
    const prisma = await getPrisma();

    const products = await prisma.product.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    const queue = getSearchQueue();
    await queue.addBulk(
      products.map((p) => ({
        name: "index-product",
        data: { productId: p.id, action: "upsert" as const },
      })),
    );

    return { enqueued: products.length };
  }),
});
