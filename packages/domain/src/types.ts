/**
 * Core branded types and domain primitives.
 * All monetary values are in minor units (tiyin: 1 KZT = 100 tiyin).
 */

// Branded ID types — prevent mixing up different entity IDs
type Brand<T, B> = T & { readonly __brand: B };

export type UserId = Brand<string, "UserId">;
export type ProductId = Brand<string, "ProductId">;
export type VariantId = Brand<string, "VariantId">;
export type CategoryId = Brand<string, "CategoryId">;
export type BrandId = Brand<string, "BrandId">;
export type CartId = Brand<string, "CartId">;
export type OrderId = Brand<string, "OrderId">;
export type PaymentId = Brand<string, "PaymentId">;
export type AddressId = Brand<string, "AddressId">;

// Money — always in minor units (tiyin), currency is explicit
export type Currency = "KZT";

export interface Money {
  readonly amount: number; // integer >= 0, in tiyin (1 KZT = 100 tiyin)
  readonly currency: Currency;
}

// Idempotency key for Kaspi API calls
export type IdempotencyKey = Brand<string, "IdempotencyKey">;
