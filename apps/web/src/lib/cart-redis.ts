/**
 * Redis-backed guest cart utilities.
 *
 * Guest carts are stored as JSON under the key `cart:{guestId}` with a 30-day TTL.
 * The guestId is a UUID v4 stored in an HttpOnly, SameSite=Lax cookie named `cartGuestId`.
 *
 * See design.md → «Корзина гостя».
 */

import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { Cart } from "@timsan/domain";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CART_GUEST_COOKIE = "cartGuestId";
const CART_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function cartKey(guestId: string): string {
  return `cart:${guestId}`;
}

// ─── Lazy Redis client ────────────────────────────────────────────────────────

async function getRedis() {
  const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  console.log("[Redis] connecting to:", url);
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reads the guest cart from Redis.
 * Returns null on cache miss or Redis error.
 */
export async function getGuestCart(guestId: string): Promise<Cart | null> {
  let redis: Awaited<ReturnType<typeof getRedis>> | null = null;
  try {
    redis = await getRedis();
    const raw = await redis.get(cartKey(guestId));
    console.log("[getGuestCart] key:", cartKey(guestId), "found:", raw !== null);
    if (!raw) return null;
    return JSON.parse(raw) as Cart;
  } catch (err) {
    console.error("[getGuestCart] Redis error:", err);
    return null;
  } finally {
    try {
      await redis?.quit();
    } catch {
      // ignore
    }
  }
}

/**
 * Writes the guest cart to Redis with a 30-day TTL.
 * Silently fails if Redis is unavailable.
 */
export async function setGuestCart(
  guestId: string,
  cart: Cart,
): Promise<void> {
  let redis: Awaited<ReturnType<typeof getRedis>> | null = null;
  try {
    redis = await getRedis();
    await redis.set(
      cartKey(guestId),
      JSON.stringify(cart),
      "EX",
      CART_TTL_SECONDS,
    );
    console.log("[setGuestCart] wrote key:", cartKey(guestId));
  } catch (err) {
    console.error("[setGuestCart] Redis error:", err);
  } finally {
    try {
      await redis?.quit();
    } catch {
      // ignore
    }
  }
}

/**
 * Deletes the guest cart from Redis.
 * Silently fails if Redis is unavailable.
 */
export async function deleteGuestCart(guestId: string): Promise<void> {
  let redis: Awaited<ReturnType<typeof getRedis>> | null = null;
  try {
    redis = await getRedis();
    await redis.del(cartKey(guestId));
  } catch {
    // Redis unavailable — silently skip
  } finally {
    try {
      await redis?.quit();
    } catch {
      // ignore
    }
  }
}

/**
 * Reads the `cartGuestId` cookie or generates a new UUID v4.
 *
 * NOTE: This function only reads the cookie — it does NOT set it.
 * Setting the cookie must be done in a Server Action or Route Handler
 * via `cookies().set(...)`.
 */
export function getOrCreateGuestId(cookies: ReadonlyRequestCookies): string {
  const existing = cookies.get(CART_GUEST_COOKIE)?.value;
  if (existing && existing.length > 0) {
    return existing;
  }
  return uuidv4();
}
