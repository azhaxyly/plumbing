/**
 * Unit tests for cart domain types and computeTotals function.
 */

import { describe, expect, it } from "vitest";

import { computeTotals, type Cart, type CartItem } from "./cart";
import type { CartId, ProductId, UserId, VariantId } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(
  overrides: Partial<CartItem> & { quantity: number; unitPriceAmount: number },
): CartItem {
  const { unitPriceAmount, ...rest } = overrides;
  return {
    id: "item-1" as CartItem["id"],
    cartId: "cart-1" as CartId,
    variantId: "variant-1" as VariantId,
    productId: "product-1" as ProductId,
    unitPrice: { amount: unitPriceAmount, currency: "KZT" },
    productName: "Test Product",
    productSku: "SKU-001",
    ...rest,
  };
}

// ─── computeTotals ────────────────────────────────────────────────────────────

describe("computeTotals", () => {
  it("computes subtotal for a single item", () => {
    const items = [makeItem({ quantity: 2, unitPriceAmount: 5000 })];
    const result = computeTotals(items);

    expect(result.subtotal).toEqual({ amount: 10000, currency: "KZT" });
    expect(result.itemCount).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.lineTotal).toEqual({ amount: 10000, currency: "KZT" });
  });

  it("sums multiple items correctly", () => {
    const items = [
      makeItem({ id: "item-1" as CartItem["id"], quantity: 1, unitPriceAmount: 10000 }),
      makeItem({ id: "item-2" as CartItem["id"], quantity: 3, unitPriceAmount: 2000 }),
    ];
    const result = computeTotals(items);

    // 1 × 10000 + 3 × 2000 = 10000 + 6000 = 16000
    expect(result.subtotal).toEqual({ amount: 16000, currency: "KZT" });
    expect(result.itemCount).toBe(4);
  });

  it("handles a zero-price item (free gift)", () => {
    const items = [makeItem({ quantity: 1, unitPriceAmount: 0 })];
    const result = computeTotals(items);

    expect(result.subtotal).toEqual({ amount: 0, currency: "KZT" });
    expect(result.itemCount).toBe(1);
  });

  it("enriches each item with lineTotal", () => {
    const items = [
      makeItem({ id: "item-1" as CartItem["id"], quantity: 5, unitPriceAmount: 300 }),
      makeItem({ id: "item-2" as CartItem["id"], quantity: 2, unitPriceAmount: 1500 }),
    ];
    const result = computeTotals(items);

    expect(result.items[0]?.lineTotal).toEqual({ amount: 1500, currency: "KZT" });
    expect(result.items[1]?.lineTotal).toEqual({ amount: 3000, currency: "KZT" });
  });

  it("does not mutate the input items", () => {
    const items = [makeItem({ quantity: 1, unitPriceAmount: 100 })];
    const original = JSON.stringify(items);
    computeTotals(items);
    expect(JSON.stringify(items)).toBe(original);
  });

  // ── Precondition violations ────────────────────────────────────────────────

  it("throws RangeError for empty items array", () => {
    expect(() => computeTotals([])).toThrow(RangeError);
    expect(() => computeTotals([])).toThrow("items must not be empty");
  });

  it("throws RangeError when quantity is zero", () => {
    const items = [makeItem({ quantity: 0, unitPriceAmount: 100 })];
    expect(() => computeTotals(items)).toThrow(RangeError);
    expect(() => computeTotals(items)).toThrow("quantity must be a positive integer");
  });

  it("throws RangeError when quantity is negative", () => {
    const items = [makeItem({ quantity: -1, unitPriceAmount: 100 })];
    expect(() => computeTotals(items)).toThrow(RangeError);
  });

  it("throws RangeError when quantity is fractional", () => {
    const items = [makeItem({ quantity: 1.5, unitPriceAmount: 100 })];
    expect(() => computeTotals(items)).toThrow(RangeError);
  });

  it("throws RangeError when unitPrice.amount is negative", () => {
    const items = [makeItem({ quantity: 1, unitPriceAmount: -1 })];
    expect(() => computeTotals(items)).toThrow(RangeError);
    expect(() => computeTotals(items)).toThrow("unitPrice.amount must be a non-negative integer");
  });

  it("throws RangeError when unitPrice.amount is fractional", () => {
    const items = [makeItem({ quantity: 1, unitPriceAmount: 99.5 })];
    expect(() => computeTotals(items)).toThrow(RangeError);
  });
});

// ─── Cart type shape (compile-time check) ─────────────────────────────────────

describe("Cart type", () => {
  it("can represent an authenticated user cart", () => {
    const cart: Cart = {
      id: "cart-abc" as CartId,
      userId: "user-1" as UserId,
      guestId: null,
      items: [],
      expiresAt: new Date("2025-12-31"),
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };
    expect(cart.userId).toBe("user-1");
    expect(cart.guestId).toBeNull();
  });

  it("can represent a guest cart", () => {
    const cart: Cart = {
      id: "cart-xyz" as CartId,
      userId: null,
      guestId: "550e8400-e29b-41d4-a716-446655440000",
      items: [],
      expiresAt: new Date("2025-12-31"),
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };
    expect(cart.userId).toBeNull();
    expect(cart.guestId).toBeTruthy();
  });
});
