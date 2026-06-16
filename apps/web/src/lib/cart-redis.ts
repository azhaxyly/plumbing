import type { Cart } from "@timsan/domain";
import Redis from "ioredis";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { v4 as uuidv4 } from "uuid";

export const CART_GUEST_COOKIE = "cartGuestId";
const CART_TTL_SECONDS = 30 * 24 * 60 * 60;

function cartKey(guestId: string): string {
  return `cart:${guestId}`;
}

// Module-level singleton — one persistent connection per process
const globalForRedis = globalThis as unknown as { _cartRedis?: Redis };

function getRedis(): Redis {
  if (!globalForRedis._cartRedis) {
    const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";
    globalForRedis._cartRedis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return globalForRedis._cartRedis;
}

export async function getGuestCart(guestId: string): Promise<Cart | null> {
  try {
    const raw = await getRedis().get(cartKey(guestId));
    if (!raw) return null;
    return JSON.parse(raw) as Cart;
  } catch (err) {
    console.error("[getGuestCart] Redis error:", err);
    return null;
  }
}

export async function setGuestCart(guestId: string, cart: Cart): Promise<void> {
  try {
    await getRedis().set(cartKey(guestId), JSON.stringify(cart), "EX", CART_TTL_SECONDS);
  } catch (err) {
    console.error("[setGuestCart] Redis error:", err);
  }
}

export async function deleteGuestCart(guestId: string): Promise<void> {
  try {
    await getRedis().del(cartKey(guestId));
  } catch {
    // Redis unavailable — silently skip
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
