/**
 * Notification handler for BullMQ worker.
 *
 * Processes jobs from the "notifications" queue:
 *   - order.created   — new order placed
 *   - order.confirmed — order confirmed by admin / Telegram bot
 *   - order.cancelled — order cancelled by admin / Telegram bot
 *
 * This module is intentionally self-contained: it does NOT import from
 * apps/web or @timsan/shared. Instead it re-implements the minimal
 * provider wiring using the same underlying packages (nodemailer, etc.)
 * that apps/web uses, plus the shared @timsan/domain types.
 *
 * See design.md → «Phase 5 — Уведомления», tasks 36.1–36.3.
 */

import nodemailer from "nodemailer";
import { prisma } from "@timsan/db";

// ─── Types (inline to avoid ESM incompatibility with @timsan/domain) ──────
// @timsan/domain → @timsan/shared → @t3-oss/env-nextjs (ESM-only)
// The worker uses module: Node16 (CommonJS), so we define the types locally.

type NotificationChannel = "email" | "telegram" | "sms";

interface OrderNotificationPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPriceCents: number;
    imageUrl?: string;
  }>;
  totalCents: number;
  shippingAddress: string;
  paymentMethod: string;
  notes?: string;
  adminUrl: string;
  createdAt: Date;
}

interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationJobData {
  type: "order.created" | "order.confirmed" | "order.cancelled";
  data: {
    orderId: string;
    newStatus?: string;
    actorType?: string;
  };
}

// ─── Email provider (inline, no web import) ───────────────────────────────────

async function sendEmailNotification(
  recipients: string[],
  payload: OrderNotificationPayload,
): Promise<void> {
  const host = process.env["SMTP_HOST"] ?? "localhost";
  const port = parseInt(process.env["SMTP_PORT"] ?? "1025", 10);
  const user = process.env["SMTP_USER"] ?? "";
  const pass = process.env["SMTP_PASS"] ?? "";
  const from = process.env["SMTP_FROM"] ?? "noreply@example.kz";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  const subject = `Новый заказ №${payload.orderNumber} на ${Math.round(payload.totalCents / 100).toLocaleString("ru-KZ")} ₸`;
  const text = buildPlainTextEmail(payload);
  // Use plain text wrapped in <pre> as HTML fallback.
  // To get rich HTML email, move the React Email template to a shared package.
  const html = `<pre style="font-family:monospace;white-space:pre-wrap">${text}</pre>`;

  await transporter.sendMail({
    from,
    to: recipients.join(", "),
    subject,
    html,
    text,
  });
}

function buildPlainTextEmail(payload: OrderNotificationPayload): string {
  const totalKzt = Math.round(payload.totalCents / 100).toLocaleString("ru-KZ");
  const itemsText = payload.items
    .map(
      (it) =>
        `  - ${it.name} (${it.sku}): ${it.quantity} × ${Math.round(it.unitPriceCents / 100).toLocaleString("ru-KZ")} ₸`,
    )
    .join("\n");

  return [
    `Новый заказ №${payload.orderNumber}`,
    ``,
    `Клиент: ${payload.customerName}`,
    `Телефон: ${payload.customerPhone}`,
    `Адрес: ${payload.shippingAddress}`,
    `Оплата: ${payload.paymentMethod}`,
    payload.notes ? `Комментарий: ${payload.notes}` : null,
    ``,
    `Заказ:`,
    itemsText,
    ``,
    `Итого: ${totalKzt} ₸`,
    ``,
    `Открыть в админке: ${payload.adminUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// ─── Telegram provider (inline, no web import) ────────────────────────────────

async function sendTelegramNotification(
  botToken: string,
  chatIds: string[],
  payload: OrderNotificationPayload,
): Promise<void> {
  const apiBase = `https://api.telegram.org/bot${botToken}`;
  const text = buildTelegramMessage(payload);

  const body = {
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Подтвердить", callback_data: `order:confirm:${payload.orderId}` },
          { text: "❌ Отменить", callback_data: `order:cancel:${payload.orderId}` },
        ],
        [{ text: "🔗 Открыть в админке", url: payload.adminUrl }],
      ],
    },
  };

  await Promise.all(
    chatIds.map(async (chatId) => {
      const response = await fetch(`${apiBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, chat_id: chatId }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error for chat ${chatId}: ${response.status} ${error}`);
      }
    }),
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTelegramMessage(payload: OrderNotificationPayload): string {
  const totalKzt = Math.round(payload.totalCents / 100).toLocaleString("ru-KZ");
  const itemsText = payload.items
    .map(
      (it) =>
        `  • ${escapeHtml(it.name)} × ${it.quantity} — ${Math.round(it.unitPriceCents / 100).toLocaleString("ru-KZ")} ₸`,
    )
    .join("\n");

  return [
    `🛒 <b>Новый заказ №${escapeHtml(payload.orderNumber)}</b>`,
    ``,
    `👤 <b>Клиент:</b> ${escapeHtml(payload.customerName)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(payload.customerPhone)}`,
    `📍 <b>Адрес:</b> ${escapeHtml(payload.shippingAddress)}`,
    `💳 <b>Оплата:</b> ${escapeHtml(payload.paymentMethod)}`,
    payload.notes ? `💬 <b>Комментарий:</b> ${escapeHtml(payload.notes)}` : null,
    ``,
    `<b>Состав заказа:</b>`,
    itemsText,
    ``,
    `<b>Итого: ${totalKzt} ₸</b>`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Processes a notification job: loads the order from DB, builds the payload,
 * and dispatches to all configured channels (email, Telegram).
 *
 * Throws if ALL channels fail — BullMQ will retry with exponential backoff.
 * Partial failures (some channels succeed) are logged but not re-thrown.
 */
export async function handleNotificationJob(job: { data: NotificationJobData }): Promise<void> {
  const { type, data } = job.data;
  const { orderId } = data;

  console.warn(`[worker] Processing notification job: ${type} for order ${orderId}`);

  // Load order from DB
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    console.warn(`[worker] Order not found: ${orderId}, skipping notification`);
    return;
  }

  // Build notification payload
  const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
  const adminUrl = `${siteUrl}/admin/orders/${orderId}`;

  const items = order.items.map((item) => {
    const entry: {
      name: string;
      sku: string;
      quantity: number;
      unitPriceCents: number;
      imageUrl?: string;
    } = {
      name: item.nameSnapshot,
      sku: item.skuSnapshot,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    };
    if (item.imageUrlSnapshot != null) {
      entry.imageUrl = item.imageUrlSnapshot;
    }
    return entry;
  });

  const payload: OrderNotificationPayload = {
    orderId: order.id,
    orderNumber: order.id.slice(-8).toUpperCase(),
    customerName: order.contactName,
    customerPhone: order.contactPhone,
    customerEmail: "",
    items,
    totalCents: order.subtotalCents,
    shippingAddress: [
      order.addressCity,
      order.addressStreet,
      order.addressBuilding,
      order.addressApartment,
    ]
      .filter(Boolean)
      .join(", "),
    paymentMethod: "Оплата при получении",
    adminUrl,
    createdAt: order.createdAt,
  };
  if (order.comment != null) {
    payload.notes = order.comment;
  }

  // Read notification settings from DB (with env fallback)
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "owner_emails",
          "telegram_bot_token",
          "telegram_chat_ids",
          "notifications_email_enabled",
          "notifications_telegram_enabled",
        ],
      },
    },
  });

  const getSetting = (key: string): string | null =>
    settings.find((s) => s.key === key)?.value ?? null;

  const ownerEmails = getSetting("owner_emails") ?? process.env["OWNER_EMAILS"] ?? "";
  const telegramBotToken =
    getSetting("telegram_bot_token") ?? process.env["TELEGRAM_BOT_TOKEN"] ?? "";
  const telegramChatIds =
    getSetting("telegram_chat_ids") ?? process.env["TELEGRAM_CHAT_IDS"] ?? "";
  const emailEnabled = getSetting("notifications_email_enabled") !== "false";
  const telegramEnabled = getSetting("notifications_telegram_enabled") !== "false";

  // Dispatch to channels
  const results: NotificationResult[] = [];

  if (emailEnabled && ownerEmails) {
    const recipients = ownerEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipients.length > 0) {
      try {
        await sendEmailNotification(recipients, payload);
        results.push({ channel: "email", success: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[worker] Email notification failed for order ${orderId}:`, err);
        results.push({ channel: "email", success: false, error });
      }
    }
  }

  if (telegramEnabled && telegramBotToken && telegramChatIds) {
    const chatIds = telegramChatIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (chatIds.length > 0) {
      try {
        await sendTelegramNotification(telegramBotToken, chatIds, payload);
        results.push({ channel: "telegram", success: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[worker] Telegram notification failed for order ${orderId}:`, err);
        results.push({ channel: "telegram", success: false, error });
      }
    }
  }

  const failed = results.filter((r) => !r.success);
  const succeeded = results.filter((r) => r.success);

  if (results.length > 0) {
    console.warn(
      `[worker] Notification result for order ${orderId}: ${results.map((r) => `${r.channel}:${r.success}`).join(", ")}`,
    );
  }

  // Throw only if ALL channels failed (triggers BullMQ retry)
  if (failed.length > 0 && succeeded.length === 0 && results.length > 0) {
    throw new Error(
      `All notification channels failed for order ${orderId}: ${failed.map((f) => f.error).join("; ")}`,
    );
  }
}
