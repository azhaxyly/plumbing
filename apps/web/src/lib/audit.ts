/**
 * Audit helper for admin mutations.
 *
 * Records every admin action to the AuditLog table.
 * Never throws — audit failures must not block the main operation.
 *
 * See design.md → «Наблюдаемость» → Аудит, task 29.2.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "role_change"
  | "block"
  | "unblock";

export type AuditEntity =
  | "Product"
  | "Category"
  | "Brand"
  | "Attribute"
  | "AttributeValue"
  | "Order"
  | "User"
  | "Setting"
  | "Page"
  | "Banner"
  | "Coupon";

export interface AuditParams {
  /** The user performing the action. Null for system actions. */
  actorUserId: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  /** State before the change (will be JSON-serialised). */
  before?: unknown;
  /** State after the change (will be JSON-serialised). */
  after?: unknown;
}

// ─── Serialisation helper ─────────────────────────────────────────────────────

/**
 * Converts an arbitrary value to a Prisma-compatible JSON value.
 * Strips `undefined` fields so Prisma's `InputJsonValue` constraint is met.
 */
function toJson(value: unknown): object | null {
  if (value === undefined || value === null) return null;
  // JSON.parse(JSON.stringify(...)) removes undefined fields and converts the
  // value to a plain object that Prisma can store as JSONB.
  return JSON.parse(JSON.stringify(value)) as object;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Writes one row to `AuditLog`.
 *
 * Guaranteed not to throw: any error is caught and logged to stderr so that
 * the calling mutation can continue normally.
 *
 * @example
 * await audit({
 *   actorUserId: ctx.userId,
 *   action: "update",
 *   entity: "Product",
 *   entityId: product.id,
 *   before: productBefore,
 *   after: productAfter,
 * });
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    const { prisma } = await import("@timsan/db");

    const beforeJson = toJson(params.before);
    const afterJson = toJson(params.after);

    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        ...(beforeJson !== null ? { before: beforeJson } : {}),
        ...(afterJson !== null ? { after: afterJson } : {}),
      },
    });
  } catch (err) {
    // Audit failures must never surface to the caller.
    console.error("[audit] Failed to write AuditLog entry:", err);
  }
}
