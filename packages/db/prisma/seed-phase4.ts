/**
 * Phase 4 Seed Script for @timsan/db
 *
 * Creates test data required for Phase 4 test cases (TC-24 — TC-30, TC-RBAC):
 *
 *  - 1 admin user (admin@example.com)
 *  - 1 manager user (manager@example.com)
 *  - 19 customer users (customer01@example.com … customer19@example.com)
 *    - 2 of them are blocked (blockedAt != null) — for TC-27
 *  - 21+ orders in all statuses (new, confirmed, delivered, cancelled)
 *    - spread over 30+ days — for TC-26 date filters
 *    - varying totalCents — for TC-26 sorting
 *  - OrderItems with/without imageUrlSnapshot and addressApartment — for TC-26
 *  - 25+ AuditLog entries with various actions/entities — for TC-29
 *  - Settings: shop contacts + notification stubs — for TC-28
 *
 * Idempotent: uses upsert throughout — safe to run multiple times.
 *
 * Run with:
 *   pnpm --filter @timsan/db seed:phase4
 *   # or from repo root:
 *   pnpm seed:phase4
 */

import { PrismaClient, OrderStatus } from "../generated/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Date that is `daysAgo` days before now */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting Phase 4 seed...");

  // ─── Admin user ─────────────────────────────────────────────────────────────
  const adminHash = await hashPassword("admin123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { role: "admin" },
    create: {
      email: "admin@example.com",
      passwordHash: adminHash,
      role: "admin",
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── Manager user ───────────────────────────────────────────────────────────
  const managerHash = await hashPassword("manager123");
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: { role: "manager" },
    create: {
      email: "manager@example.com",
      passwordHash: managerHash,
      role: "manager",
    },
  });
  console.log(`✅ Manager: ${manager.email}`);

  // ─── Customer users (19 total, 2 blocked) ───────────────────────────────────
  const customerHash = await hashPassword("customer123");
  const customers: { id: string; email: string }[] = [];

  for (let i = 1; i <= 19; i++) {
    const num = String(i).padStart(2, "0");
    const email = `customer${num}@example.com`;
    // customers 01 and 02 are blocked — for TC-27
    const blockedAt = i <= 2 ? daysAgo(5) : null;

    const customer = await prisma.user.upsert({
      where: { email },
      update: { blockedAt },
      create: {
        email,
        passwordHash: customerHash,
        role: "customer",
        blockedAt,
      },
    });
    customers.push({ id: customer.id, email: customer.email });
  }
  console.log(`✅ Customers: ${customers.length} users (2 blocked)`);

  // ─── Ensure we have at least one product/variant for order items ─────────────
  // Re-use or create a minimal product so OrderItems can reference productId/variantId
  let demoProduct = await prisma.product.findUnique({ where: { sku: "SEED-DEMO-001" } });
  if (!demoProduct) {
    // Need a brand first
    const demoBrand = await prisma.brand.upsert({
      where: { slug: "demo-brand" },
      update: {},
      create: { slug: "demo-brand", name: "Demo Brand" },
    });
    demoProduct = await prisma.product.create({
      data: {
        slug: "seed-demo-product-001",
        name: "Demo Product (seed)",
        sku: "SEED-DEMO-001",
        brandId: demoBrand.id,
        priceCents: 1_000_000,
        status: "active",
      },
    });
  }

  let demoVariant = await prisma.productVariant.findUnique({ where: { sku: "SEED-DEMO-VAR-001" } });
  if (!demoVariant) {
    demoVariant = await prisma.productVariant.create({
      data: {
        productId: demoProduct.id,
        sku: "SEED-DEMO-VAR-001",
        priceCents: 1_000_000,
        quantity: 100,
      },
    });
    await prisma.product.update({
      where: { id: demoProduct.id },
      data: { defaultVariantId: demoVariant.id },
    });
  }

  // ─── Orders (21 total, all statuses, spread over 30+ days) ──────────────────
  //
  // Distribution:
  //   - 6 × new       (indices 0-5)
  //   - 6 × confirmed (indices 6-11)
  //   - 6 × delivered (indices 12-17)
  //   - 3 × cancelled (indices 18-20)
  //
  // Dates: today, last 30 days, older than 30 days
  // Amounts: vary from ~5 000 KZT to ~500 000 KZT

  const orderStatuses: OrderStatus[] = [
    "new", "new", "new", "new", "new", "new",
    "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed",
    "delivered", "delivered", "delivered", "delivered", "delivered", "delivered",
    "cancelled", "cancelled", "cancelled",
  ];

  // Days ago for each order (0 = today, 35 = 35 days ago)
  const orderDaysAgo = [0, 1, 3, 7, 14, 20, 0, 2, 5, 10, 25, 35, 1, 4, 8, 15, 28, 40, 0, 6, 32];

  // Prices in tiyins (KZT × 100): vary widely for sorting tests
  const orderPrices = [
    500_000,   // 5 000 KZT
    1_200_000, // 12 000 KZT
    2_500_000, // 25 000 KZT
    4_800_000, // 48 000 KZT
    7_300_000, // 73 000 KZT
    9_900_000, // 99 000 KZT
    1_500_000,
    3_200_000,
    6_700_000,
    11_000_000,
    18_500_000,
    25_000_000,
    800_000,
    2_100_000,
    4_400_000,
    8_800_000,
    15_000_000,
    50_000_000, // 500 000 KZT
    600_000,
    3_500_000,
    12_000_000,
  ];

  const createdOrders: { id: string; status: OrderStatus }[] = [];

  for (let i = 0; i < orderStatuses.length; i++) {
    const customerIndex = i % customers.length;
    const customer = customers[customerIndex]!;
    const status = orderStatuses[i]!;
    const createdAt = daysAgo(orderDaysAgo[i]!);
    const subtotalCents = orderPrices[i]!;
    const orderNum = String(i + 1).padStart(3, "0");

    // Use a stable unique key based on index so upsert is idempotent.
    // We store a comment with the seed marker.
    const seedComment = `seed-phase4-order-${orderNum}`;

    // Check if this seed order already exists
    const existing = await prisma.order.findFirst({
      where: { comment: seedComment },
    });

    let order: { id: string; status: OrderStatus };

    if (existing) {
      order = { id: existing.id, status: existing.status };
    } else {
      // Alternate between with/without addressApartment — for TC-26.2.10
      const hasApartment = i % 2 === 0;

      const created = await prisma.order.create({
        data: {
          userId: customer.id,
          status,
          contactName: `Тест Пользователь ${customerIndex + 1}`,
          contactPhone: `+7700${String(customerIndex + 1).padStart(7, "0")}`,
          addressStreet: "ул. Абая",
          addressBuilding: String(i + 1),
          addressApartment: hasApartment ? String(i * 2 + 1) : null,
          addressCity: "Алматы",
          comment: seedComment,
          consentGiven: true,
          consentAt: createdAt,
          subtotalCents,
          createdAt,
          updatedAt: createdAt,
        },
      });
      order = { id: created.id, status: created.status };

      // ─── OrderItems ──────────────────────────────────────────────────────────
      // Alternate between with/without imageUrlSnapshot — for TC-26.2.6/7
      const hasImage = i % 3 !== 0; // ~2/3 have image, ~1/3 don't

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          variantId: demoVariant.id,
          productId: demoProduct.id,
          nameSnapshot: `Товар ${orderNum}`,
          skuSnapshot: `SKU-${orderNum}`,
          unitPriceCents: subtotalCents,
          quantity: 1,
          imageUrlSnapshot: hasImage
            ? `https://placehold.co/400x300/e2e8f0/64748b?text=Order+${orderNum}`
            : null,
        },
      });
    }

    createdOrders.push(order);
  }

  console.log(`✅ Orders: ${createdOrders.length} orders across all statuses`);

  // ─── AuditLog (25+ entries) ──────────────────────────────────────────────────
  //
  // Mix of:
  //   - actions by admin (actorUserId = admin.id)
  //   - actions by manager (actorUserId = manager.id)
  //   - system events (actorUserId = null)
  //
  // Various action/entity combinations for TC-29 filters

  const auditEntries = [
    // Order status changes
    { action: "ORDER_STATUS_CHANGED", entity: "Order", actorId: manager.id, daysBack: 0 },
    { action: "ORDER_STATUS_CHANGED", entity: "Order", actorId: manager.id, daysBack: 1 },
    { action: "ORDER_STATUS_CHANGED", entity: "Order", actorId: admin.id, daysBack: 2 },
    { action: "ORDER_STATUS_CHANGED", entity: "Order", actorId: manager.id, daysBack: 3 },
    { action: "ORDER_STATUS_CHANGED", entity: "Order", actorId: null, daysBack: 5 },
    { action: "ORDER_STATUS_CHANGED", entity: "Order", actorId: manager.id, daysBack: 7 },
    // User role changes
    { action: "USER_ROLE_CHANGED", entity: "User", actorId: admin.id, daysBack: 1 },
    { action: "USER_ROLE_CHANGED", entity: "User", actorId: admin.id, daysBack: 4 },
    { action: "USER_ROLE_CHANGED", entity: "User", actorId: admin.id, daysBack: 10 },
    // User block/unblock
    { action: "USER_BLOCKED", entity: "User", actorId: admin.id, daysBack: 2 },
    { action: "USER_UNBLOCKED", entity: "User", actorId: admin.id, daysBack: 6 },
    { action: "USER_BLOCKED", entity: "User", actorId: manager.id, daysBack: 8 },
    // Settings updates
    { action: "SETTINGS_UPDATED", entity: "Setting", actorId: admin.id, daysBack: 0 },
    { action: "SETTINGS_UPDATED", entity: "Setting", actorId: admin.id, daysBack: 3 },
    { action: "SETTINGS_UPDATED", entity: "Setting", actorId: manager.id, daysBack: 14 },
    // Product changes
    { action: "PRODUCT_CREATED", entity: "Product", actorId: manager.id, daysBack: 1 },
    { action: "PRODUCT_UPDATED", entity: "Product", actorId: manager.id, daysBack: 2 },
    { action: "PRODUCT_DELETED", entity: "Product", actorId: admin.id, daysBack: 20 },
    // Category changes
    { action: "CATEGORY_CREATED", entity: "Category", actorId: admin.id, daysBack: 5 },
    { action: "CATEGORY_UPDATED", entity: "Category", actorId: manager.id, daysBack: 9 },
    // System events (actorUserId = null)
    { action: "SYSTEM_REINDEX", entity: "Product", actorId: null, daysBack: 1 },
    { action: "SYSTEM_REINDEX", entity: "Product", actorId: null, daysBack: 7 },
    { action: "SYSTEM_CLEANUP", entity: "Cart", actorId: null, daysBack: 3 },
    { action: "SYSTEM_CLEANUP", entity: "Cart", actorId: null, daysBack: 10 },
    // Order created (system)
    { action: "ORDER_CREATED", entity: "Order", actorId: null, daysBack: 0 },
    { action: "ORDER_CREATED", entity: "Order", actorId: null, daysBack: 2 },
    { action: "ORDER_CREATED", entity: "Order", actorId: null, daysBack: 4 },
    // Banner changes
    { action: "BANNER_CREATED", entity: "Banner", actorId: admin.id, daysBack: 15 },
    { action: "BANNER_UPDATED", entity: "Banner", actorId: manager.id, daysBack: 20 },
  ];

  // We use a seed marker in entityId to make upsert idempotent.
  // AuditLog has no unique constraint other than id, so we check by a composite marker.
  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i]!;
    const seedEntityId = `seed-phase4-audit-${String(i + 1).padStart(3, "0")}`;

    const existing = await prisma.auditLog.findFirst({
      where: { entityId: seedEntityId },
    });

    if (!existing) {
      const entityId =
        entry.entity === "Order" && createdOrders[i % createdOrders.length]
          ? createdOrders[i % createdOrders.length]!.id
          : seedEntityId;

      await prisma.auditLog.create({
        data: {
          actorUserId: entry.actorId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entity === "Order" ? entityId : seedEntityId,
          before:
            entry.action.includes("CHANGED") || entry.action.includes("UPDATED")
              ? { status: "previous_value" }
              : null,
          after:
            entry.action.includes("CHANGED") || entry.action.includes("UPDATED")
              ? { status: "new_value" }
              : null,
          createdAt: daysAgo(entry.daysBack),
        },
      });
    }
  }

  console.log(`✅ AuditLog: ${auditEntries.length} entries`);

  // ─── Settings ────────────────────────────────────────────────────────────────
  //
  // Shop contacts + notification stubs — for TC-28

  const phase4Settings = [
    // Shop contacts
    { key: "shop_phone", value: "+7 776 201 64 66" },
    { key: "shop_email", value: "info@example.com" },
    { key: "shop_instagram", value: "" },
    { key: "shop_legal_name", value: "ТОО «Timsan»" },
    { key: "shop_bin", value: "123456789012" },
    // Notification stubs
    { key: "owner_emails", value: JSON.stringify(["owner@example.com", "manager@example.com"]) },
    { key: "telegram_bot_token", value: "1234567890:AABBCCDDEEFFaabbccddeeff-placeholder" },
    { key: "telegram_chat_ids", value: JSON.stringify(["-1001234567890", "-1009876543210"]) },
    // Other defaults
    { key: "shop_name", value: "Timsan" },
    { key: "cod_enabled", value: "false" },
    { key: "search_fallback_enabled", value: "false" },
  ];

  for (const setting of phase4Settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, updatedByUserId: admin.id },
      create: {
        key: setting.key,
        value: setting.value,
        updatedByUserId: admin.id,
      },
    });
  }

  console.log(`✅ Settings: ${phase4Settings.length} entries`);

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const userCount = await prisma.user.count();
  const orderCount = await prisma.order.count();
  const auditCount = await prisma.auditLog.count();
  const settingCount = await prisma.setting.count();

  console.log("\n📊 Database summary after Phase 4 seed:");
  console.log(`   Users:     ${userCount} (need ≥ 21)`);
  console.log(`   Orders:    ${orderCount} (need ≥ 21)`);
  console.log(`   AuditLogs: ${auditCount} (need ≥ 25)`);
  console.log(`   Settings:  ${settingCount}`);
  console.log("\n🎉 Phase 4 seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Phase 4 seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
