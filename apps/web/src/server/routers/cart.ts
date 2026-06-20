/**
 * tRPC cart router.
 *
 * Handles cart operations for both guests (Redis) and authenticated users (DB).
 *
 * Guest flow:
 *   - Cart stored in Redis under key `cart:{guestId}` (TTL 30 days)
 *   - guestId read from `cartGuestId` HttpOnly cookie
 *
 * Authenticated flow:
 *   - Cart stored in PostgreSQL via Prisma (Cart / CartItem tables)
 *
 * See design.md → «Корзина гостя», task 19.2.
 */

import type {
  Cart,
  CartItem,
  CartId,
  CartItemId,
  ProductId,
  VariantId,
  UserId,
} from "@timsan/domain";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { getGuestCart, setGuestCart, getOrCreateGuestId } from "@/lib/cart-redis";
import { createTRPCRouter, publicProcedure } from "@/server/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

/** 30 days from now */
function guestExpiry(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

/** 90 days from now for authenticated users */
function userExpiry(): Date {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
}

// ─── DB cart helpers ──────────────────────────────────────────────────────────

async function getDbCart(userId: string): Promise<Cart | null> {
  const prisma = await getPrisma();
  const dbCart = await prisma.cart.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (!dbCart) return null;

  return {
    id: dbCart.id as CartId,
    userId: dbCart.userId as UserId | null,
    guestId: dbCart.guestId,
    expiresAt: dbCart.expiresAt,
    createdAt: dbCart.createdAt,
    updatedAt: dbCart.updatedAt,
    items: dbCart.items.map((item) => ({
      id: item.id as CartItemId,
      cartId: item.cartId as CartId,
      variantId: item.variantId as VariantId,
      productId: item.productId as ProductId,
      quantity: item.quantity,
      unitPrice: { amount: item.unitPriceCents, currency: "KZT" as const },
      productName: item.productName,
      productSku: item.productSku,
      ...(item.productImageUrl !== null ? { productImageUrl: item.productImageUrl } : {}),
    })) as CartItem[],
  };
}

async function getOrCreateDbCart(userId: string): Promise<Cart> {
  const existing = await getDbCart(userId);
  if (existing) return existing;

  const prisma = await getPrisma();
  const dbCart = await prisma.cart.create({
    data: {
      userId,
      expiresAt: userExpiry(),
    },
    include: { items: true },
  });

  return {
    id: dbCart.id as CartId,
    userId: dbCart.userId as UserId | null,
    guestId: dbCart.guestId,
    expiresAt: dbCart.expiresAt,
    createdAt: dbCart.createdAt,
    updatedAt: dbCart.updatedAt,
    items: [],
  };
}

/**
 * Authoritative cart-line data resolved from the DB by variantId.
 *
 * Security: the client is NEVER trusted for price/name/sku/image — only for
 * `variantId` and `quantity`. Otherwise a crafted `cart.add` request could set
 * `unitPrice` to an arbitrary value and check out at any price.
 *
 * Returns null if the variant doesn't exist or its product isn't purchasable
 * (status ≠ active).
 */
async function loadVariantForCart(variantId: string): Promise<{
  productId: string;
  unitPriceCents: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
} | null> {
  const prisma = await getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      sku: true,
      priceCents: true,
      product: {
        select: {
          id: true,
          name: true,
          status: true,
          images: {
            select: { url: true },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
          },
        },
      },
    },
  });

  if (!variant || variant.product.status !== "active") return null;

  return {
    productId: variant.product.id,
    unitPriceCents: variant.priceCents,
    productName: variant.product.name,
    productSku: variant.sku,
    productImageUrl: variant.product.images[0]?.url ?? null,
  };
}

// ─── Input schemas ────────────────────────────────────────────────────────────

const addItemInput = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
  // Deprecated/ignored: price, name, sku and image are resolved server-side
  // from the DB variant (never trust the client for price). Kept optional for
  // backward compatibility with clients that still send them.
  productId: z.string().min(1).optional(),
  unitPrice: z.number().int().nonnegative().optional(),
  productName: z.string().min(1).optional(),
  productSku: z.string().min(1).optional(),
  productImageUrl: z.string().url().optional(),
});

const updateItemInput = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().nonnegative(),
});

const removeItemInput = z.object({
  itemId: z.string().min(1),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const cartRouter = createTRPCRouter({
  /**
   * Get the current cart (guest or authenticated).
   */
  get: publicProcedure.query(async ({ ctx }) => {
    if (ctx.userId) {
      return getDbCart(ctx.userId);
    }

    const cookieStore = await cookies();
    const guestId = getOrCreateGuestId(cookieStore);
    const result = await getGuestCart(guestId);
    return result;
  }),

  /**
   * Add an item to the cart.
   * For guests: reads/writes Redis. Sets cartGuestId cookie if not present.
   * For authenticated users: reads/writes DB.
   */
  add: publicProcedure.input(addItemInput).mutation(async ({ ctx, input }) => {
    // Resolve authoritative price/name/sku/image from the DB. Never trust the
    // client-supplied values (price manipulation guard).
    const variant = await loadVariantForCart(input.variantId);
    if (!variant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Товар недоступен" });
    }

    if (ctx.userId) {
      // ── Authenticated: DB cart ─────────────────────────────────────────────
      const cart = await getOrCreateDbCart(ctx.userId);
      const prisma = await getPrisma();

      // Check if variant already in cart
      const existing = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, variantId: input.variantId },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + input.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: input.variantId,
            productId: variant.productId,
            quantity: input.quantity,
            unitPriceCents: variant.unitPriceCents,
            productName: variant.productName,
            productSku: variant.productSku,
            ...(variant.productImageUrl !== null
              ? { productImageUrl: variant.productImageUrl }
              : {}),
          },
        });
      }

      // Touch updatedAt
      await prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });

      return getDbCart(ctx.userId);
    }

    // ── Guest: Redis cart ──────────────────────────────────────────────────
    const cookieStore = await cookies();
    const guestId = getOrCreateGuestId(cookieStore);

    // NOTE: Setting cookies from a tRPC Route Handler is unreliable in Next.js.
    // The cartGuestId cookie is set client-side in AddToCartButton via document.cookie
    // immediately after a successful cart.add response.

    const existingCart = await getGuestCart(guestId);
    const now = new Date();

    const cart: Cart = existingCart ?? {
      id: uuidv4() as CartId,
      userId: null,
      guestId,
      items: [],
      expiresAt: guestExpiry(),
      createdAt: now,
      updatedAt: now,
    };

    // Check if variant already in cart
    const existingItemIndex = cart.items.findIndex((item) => item.variantId === input.variantId);

    if (existingItemIndex >= 0) {
      const existingItem = cart.items[existingItemIndex];
      if (existingItem) {
        cart.items[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + input.quantity,
        };
      }
    } else {
      const newItem: CartItem = {
        id: uuidv4() as CartItemId,
        cartId: cart.id,
        variantId: input.variantId as VariantId,
        productId: variant.productId as ProductId,
        quantity: input.quantity,
        unitPrice: { amount: variant.unitPriceCents, currency: "KZT" },
        productName: variant.productName,
        productSku: variant.productSku,
        ...(variant.productImageUrl !== null ? { productImageUrl: variant.productImageUrl } : {}),
      };
      cart.items.push(newItem);
    }

    cart.updatedAt = now;
    await setGuestCart(guestId, cart);
    return cart;
  }),

  /**
   * Update item quantity. If quantity === 0, removes the item.
   */
  update: publicProcedure.input(updateItemInput).mutation(async ({ ctx, input }) => {
    if (ctx.userId) {
      // ── Authenticated: DB cart ───────────────────────────────────────────
      const prisma = await getPrisma();

      if (input.quantity === 0) {
        await prisma.cartItem.delete({ where: { id: input.itemId } });
      } else {
        await prisma.cartItem.update({
          where: { id: input.itemId },
          data: { quantity: input.quantity },
        });
      }

      return getDbCart(ctx.userId);
    }

    // ── Guest: Redis cart ────────────────────────────────────────────────
    const cookieStore = await cookies();
    const guestId = getOrCreateGuestId(cookieStore);
    const cart = await getGuestCart(guestId);

    if (!cart) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cart not found" });
    }

    if (input.quantity === 0) {
      cart.items = cart.items.filter((item) => item.id !== input.itemId);
    } else {
      const idx = cart.items.findIndex((item) => item.id === input.itemId);
      if (idx >= 0) {
        const item = cart.items[idx];
        if (item) {
          cart.items[idx] = { ...item, quantity: input.quantity };
        }
      }
    }

    cart.updatedAt = new Date();
    await setGuestCart(guestId, cart);
    return cart;
  }),

  /**
   * Remove an item from the cart by itemId.
   */
  remove: publicProcedure.input(removeItemInput).mutation(async ({ ctx, input }) => {
    if (ctx.userId) {
      // ── Authenticated: DB cart ───────────────────────────────────────────
      const prisma = await getPrisma();
      await prisma.cartItem.delete({ where: { id: input.itemId } });
      return getDbCart(ctx.userId);
    }

    // ── Guest: Redis cart ────────────────────────────────────────────────
    const cookieStore = await cookies();
    const guestId = getOrCreateGuestId(cookieStore);
    const cart = await getGuestCart(guestId);

    if (!cart) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cart not found" });
    }

    cart.items = cart.items.filter((item) => item.id !== input.itemId);
    cart.updatedAt = new Date();
    await setGuestCart(guestId, cart);
    return cart;
  }),
});
