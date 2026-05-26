/**
 * Order state machine.
 *
 * Defines the allowed status transitions for an Order and provides
 * pure functions to validate and perform transitions.
 *
 * Allowed transitions:
 *   new       → confirmed | cancelled
 *   confirmed → delivered | cancelled
 *   delivered → (final, no transitions)
 *   cancelled → (final, no transitions)
 *
 * See design.md → «Состояния заказа и платежа (state machines)».
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus = "new" | "confirmed" | "delivered" | "cancelled";

// ─── Transition table ─────────────────────────────────────────────────────────

/**
 * Maps each status to the list of statuses it can transition to.
 * Final states map to an empty array.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

// ─── Pure functions ───────────────────────────────────────────────────────────

/**
 * Returns `true` if transitioning from `from` to `to` is allowed.
 *
 * @param from - The current order status.
 * @param to   - The desired next status.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Performs a status transition, returning the new status.
 *
 * @param currentStatus - The current order status.
 * @param newStatus     - The desired next status.
 * @returns The new status (same as `newStatus` if transition is allowed).
 * @throws {Error} if the transition is not allowed.
 */
export function transitionOrder(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
): OrderStatus {
  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `Order transition not allowed: ${currentStatus} → ${newStatus}. ` +
        `Allowed transitions from "${currentStatus}": [${ALLOWED_TRANSITIONS[currentStatus].join(", ") || "none"}]`,
    );
  }
  return newStatus;
}
