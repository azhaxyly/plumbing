/**
 * Money type and integer arithmetic in tiyins (тийины).
 *
 * All monetary values are stored as non-negative integers in the minor unit:
 *   1 KZT = 100 tiyins
 *
 * Rules enforced by assertions:
 *   - amount must be a non-negative integer
 *   - currencies must match for add/sub
 *   - factor must be a non-negative integer for mul
 *
 * No floating-point arithmetic is used anywhere (P-15).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Currency = "KZT";

export interface Money {
  readonly amount: number; // integer >= 0, in tiyins
  readonly currency: Currency;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Assert that `amount` is a non-negative integer.
 * Throws a RangeError if the assertion fails.
 */
function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `${label} must be a non-negative integer, got: ${value}`
    );
  }
}

/**
 * Assert that two Money values share the same currency.
 * Throws a TypeError if they differ.
 */
function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(
      `Currency mismatch: ${a.currency} vs ${b.currency}`
    );
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a zero-value Money for the given currency.
 *
 * @param currency - defaults to "KZT"
 */
export function zero(currency: Currency = "KZT"): Money {
  return { amount: 0, currency };
}

/**
 * Adds two Money values.
 * Both must share the same currency.
 *
 * @throws {TypeError}   if currencies differ
 * @throws {RangeError}  if either amount is not a non-negative integer
 */
export function add(a: Money, b: Money): Money {
  assertNonNegativeInteger(a.amount, "a.amount");
  assertNonNegativeInteger(b.amount, "b.amount");
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

/**
 * Subtracts `b` from `a`, clamped to zero (never negative).
 * Both must share the same currency.
 *
 * @throws {TypeError}   if currencies differ
 * @throws {RangeError}  if either amount is not a non-negative integer
 */
export function sub(a: Money, b: Money): Money {
  assertNonNegativeInteger(a.amount, "a.amount");
  assertNonNegativeInteger(b.amount, "b.amount");
  assertSameCurrency(a, b);
  const result = a.amount - b.amount;
  return { amount: result > 0 ? result : 0, currency: a.currency };
}

/**
 * Multiplies a Money value by a non-negative integer factor.
 *
 * @throws {RangeError}  if m.amount is not a non-negative integer
 * @throws {RangeError}  if factor is not a non-negative integer
 */
export function mul(m: Money, factor: number): Money {
  assertNonNegativeInteger(m.amount, "m.amount");
  assertNonNegativeInteger(factor, "factor");
  return { amount: m.amount * factor, currency: m.currency };
}

/**
 * Clamps a Money value to zero if its amount is negative.
 * Useful when working with values that may have been computed externally.
 *
 * @throws {RangeError}  if m.amount is not an integer
 */
export function nonNegative(m: Money): Money {
  if (!Number.isInteger(m.amount)) {
    throw new RangeError(
      `m.amount must be an integer, got: ${m.amount}`
    );
  }
  return { amount: m.amount > 0 ? m.amount : 0, currency: m.currency };
}

/**
 * Formats a Money value as a human-readable string using the ru-KZ locale.
 * Example: { amount: 25000, currency: "KZT" } → "250,00 ₸"
 *
 * @throws {RangeError}  if m.amount is not a non-negative integer
 */
export function toFormatted(m: Money): string {
  assertNonNegativeInteger(m.amount, "m.amount");
  const kzt = m.amount / 100;
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
  }).format(kzt);
}

/**
 * Converts a whole-KZT amount to a Money value in tiyins (× 100).
 * The input must be a non-negative integer (no fractional tenge).
 *
 * @throws {RangeError}  if kzt is not a non-negative integer
 */
export function fromKzt(kzt: number): Money {
  assertNonNegativeInteger(kzt, "kzt");
  return { amount: kzt * 100, currency: "KZT" };
}

/**
 * Converts a Money value in tiyins to whole KZT (÷ 100).
 * Returns a number that may have up to 2 decimal places.
 *
 * @throws {RangeError}  if m.amount is not a non-negative integer
 */
export function toKzt(m: Money): number {
  assertNonNegativeInteger(m.amount, "m.amount");
  return m.amount / 100;
}
