"use server";

/**
 * Server Action for checkout form submission.
 *
 * Validates the form data, resolves the current cart (DB for authenticated
 * users, Redis→DB for guests), then calls submitOrder in a single transaction.
 *
 * See design.md → «Алгоритм submitOrder», task 21.1.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getGuestCart, deleteGuestCart, CART_GUEST_COOKIE } from "@/lib/cart-redis";
import { checkoutSchema } from "@/lib/checkout-schemas";
import { submitOrder } from "@/lib/order-actions";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export interface CheckoutActionState {
  success: boolean;
  errors?: Partial<Record<string, string[]>>;
  message?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

/**
 * Resolves the DB cart ID for the current session.
 *
 * - Authenticated: finds the active DB cart by userId.
 * - Guest: reads the Redis cart and upserts it into the DB so that
 *   submitOrder can operate on a DB record.
 *
 * Returns null if no cart exists or the cart is empty.
 */
async function resolveCartId(
  userId: string | null,
  guestId: string | null,
): Promise<string | null> {
  const prisma = await getPrisma();

  if (userId) {
    // Authenticated: find active DB cart
    const cart = await prisma.cart.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, items: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (!cart || cart.items.length === 0) return null;
    return cart.id;
  }

  if (guestId) {
    // Guest: load from Redis, persist to DB if needed
    const redisCart = await getGuestCart(guestId);
    if (!redisCart || redisCart.items.length === 0) return null;

    // Find or create a DB cart for this guest
    let dbCart = await prisma.cart.findFirst({
      where: { guestId, expiresAt: { gt: new Date() } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (!dbCart) {
      dbCart = await prisma.cart.create({
        data: {
          guestId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { items: true },
      });
    }

    // Sync Redis items into DB cart (upsert by variantId)
    for (const item of redisCart.items) {
      const existing = dbCart.items.find((i) => i.variantId === item.variantId);
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: item.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: dbCart.id,
            variantId: item.variantId as string,
            productId: item.productId as string,
            quantity: item.quantity,
            unitPriceCents: item.unitPrice.amount,
            productName: item.productName,
            productSku: item.productSku,
            ...(item.productImageUrl !== undefined
              ? { productImageUrl: item.productImageUrl }
              : {}),
          },
        });
      }
    }

    return dbCart.id;
  }

  return null;
}

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Handles checkout form submission.
 *
 * Validates all fields with Zod, resolves the cart, calls submitOrder,
 * then redirects to the success page with the real orderId.
 */
export async function submitCheckout(
  _prevState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  // Honeypot: bots fill hidden fields, real users don't
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    redirect("/checkout/success?orderId=submitted");
  }

  // Rate limit: 5 orders per hour per IP
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    keyPrefix: "rl:checkout",
    points: 20,
    duration: 3600,
  });
  if (!rl.allowed) {
    return {
      success: false,
      message: `Слишком много заявок. Попробуйте через ${rl.retryAfter ?? 60} сек.`,
    };
  }

  // Parse raw form data
  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    city: formData.get("city") ?? "",
    street: formData.get("street") ?? "",
    apartment: formData.get("apartment") ?? "",
    comment: formData.get("comment") ?? "",
    // Checkbox: present in FormData only when checked
    consent: formData.get("consent") === "on" ? true : undefined,
  };

  // Validate with Zod
  const result = checkoutSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors: Partial<Record<string, string[]>> = {};
    for (const [field, messages] of Object.entries(
      result.error.flatten().fieldErrors,
    )) {
      fieldErrors[field] = messages;
    }
    return {
      success: false,
      errors: fieldErrors,
    };
  }

  const data = result.data;

  // Resolve session
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const cookieStore = await cookies();
  const guestId = cookieStore.get(CART_GUEST_COOKIE)?.value ?? null;

  // Resolve cart ID
  const cartId = await resolveCartId(userId, guestId);

  if (!cartId) {
    return {
      success: false,
      message: "Ваша корзина пуста. Добавьте товары перед оформлением заявки.",
    };
  }

  // Submit order
  let orderId: string;
  try {
    const orderResult = await submitOrder(
      cartId,
      { name: data.name, phone: data.phone },
      {
        street: data.street || "",
        building: "",
        ...(data.apartment ? { apartment: data.apartment } : {}),
        city: data.city || "",
      },
      data.comment || undefined,
      userId,
      guestId,
    );
    orderId = orderResult.orderId;
  } catch (err) {
    console.error("[submitCheckout] submitOrder failed:", err);
    return {
      success: false,
      message: "Не удалось оформить заявку. Попробуйте ещё раз.",
    };
  }

  // Clear Redis cart for guests after successful order
  if (guestId) {
    await deleteGuestCart(guestId);
  }

  // Redirect to success page with real orderId
  redirect(`/checkout/success?orderId=${orderId}`);
}
