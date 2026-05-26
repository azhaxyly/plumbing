"use server";

/**
 * Server Actions for admin settings page.
 * Handles shop contacts and notification settings with audit logging.
 *
 * See tasks 28.1 and 28.2.
 */

import { prisma } from "@timsan/db";

import { auth } from "@/auth";
import { audit } from "@/lib/audit";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SaveShopContactsData {
  shop_phone: string;
  shop_email: string;
  shop_instagram: string;
  shop_legal_name: string;
  shop_bin: string;
}

export interface SaveNotificationSettingsData {
  owner_emails: string;
  telegram_bot_token: string;
  telegram_chat_ids: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertSetting(
  key: string,
  value: string,
  actorUserId: string | null,
  beforeValue: string | null,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value, updatedByUserId: actorUserId },
    update: { value, updatedByUserId: actorUserId },
  });

  await audit({
    actorUserId,
    action: "update",
    entity: "Setting",
    entityId: key,
    before: { key, value: beforeValue },
    after: { key, value },
  });
}

async function fetchCurrentSettings(
  keys: string[],
): Promise<Record<string, string | null>> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });

  const map: Record<string, string | null> = {};
  for (const key of keys) {
    map[key] = null;
  }
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

// ─── saveShopContacts ─────────────────────────────────────────────────────────

export async function saveShopContacts(
  data: SaveShopContactsData,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Не авторизован" };
  }

  const user = session.user as { id?: string; role?: string };
  const role = user.role ?? "customer";

  if (role !== "admin" && role !== "manager") {
    return { success: false, error: "Недостаточно прав" };
  }

  const actorUserId = user.id ?? null;

  const keys = [
    "shop_phone",
    "shop_email",
    "shop_instagram",
    "shop_legal_name",
    "shop_bin",
  ];

  let currentValues: Record<string, string | null>;
  try {
    currentValues = await fetchCurrentSettings(keys);
  } catch {
    return { success: false, error: "Ошибка при получении текущих настроек" };
  }

  try {
    await upsertSetting("shop_phone", data.shop_phone, actorUserId, currentValues["shop_phone"] ?? null);
    await upsertSetting("shop_email", data.shop_email, actorUserId, currentValues["shop_email"] ?? null);
    await upsertSetting("shop_instagram", data.shop_instagram, actorUserId, currentValues["shop_instagram"] ?? null);
    await upsertSetting("shop_legal_name", data.shop_legal_name, actorUserId, currentValues["shop_legal_name"] ?? null);
    await upsertSetting("shop_bin", data.shop_bin, actorUserId, currentValues["shop_bin"] ?? null);
  } catch {
    return { success: false, error: "Ошибка при сохранении настроек" };
  }

  return { success: true };
}

// ─── saveNotificationSettings ─────────────────────────────────────────────────

export async function saveNotificationSettings(
  data: SaveNotificationSettingsData,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Не авторизован" };
  }

  const user = session.user as { id?: string; role?: string };
  const role = user.role ?? "customer";

  if (role !== "admin") {
    return {
      success: false,
      error: "Только администратор может изменять настройки уведомлений",
    };
  }

  const actorUserId = user.id ?? null;

  // Validate owner_emails
  let parsedEmails: string[];
  try {
    parsedEmails = JSON.parse(data.owner_emails) as string[];
    if (!Array.isArray(parsedEmails)) {
      return { success: false, error: "owner_emails должен быть массивом" };
    }
  } catch {
    return { success: false, error: "Неверный формат owner_emails (ожидается JSON-массив)" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of parsedEmails) {
    if (typeof email !== "string" || !emailRegex.test(email)) {
      return { success: false, error: `Неверный формат email: "${email}"` };
    }
  }

  // Validate telegram_chat_ids
  try {
    const parsed = JSON.parse(data.telegram_chat_ids) as unknown;
    if (!Array.isArray(parsed)) {
      return { success: false, error: "telegram_chat_ids должен быть массивом" };
    }
  } catch {
    return { success: false, error: "Неверный формат telegram_chat_ids (ожидается JSON-массив)" };
  }

  const keys = ["owner_emails", "telegram_bot_token", "telegram_chat_ids"];
  let currentValues: Record<string, string | null>;
  try {
    currentValues = await fetchCurrentSettings(keys);
  } catch {
    return { success: false, error: "Ошибка при получении текущих настроек" };
  }

  function maskToken(token: string): string {
    if (!token) return "";
    return token.slice(0, 8) + "...";
  }

  try {
    // owner_emails
    await prisma.setting.upsert({
      where: { key: "owner_emails" },
      create: { key: "owner_emails", value: data.owner_emails, updatedByUserId: actorUserId },
      update: { value: data.owner_emails, updatedByUserId: actorUserId },
    });
    await audit({
      actorUserId,
      action: "update",
      entity: "Setting",
      entityId: "owner_emails",
      before: { key: "owner_emails", value: currentValues["owner_emails"] },
      after: { key: "owner_emails", value: data.owner_emails },
    });

    // telegram_bot_token — mask in audit
    const prevToken = currentValues["telegram_bot_token"] ?? "";
    await prisma.setting.upsert({
      where: { key: "telegram_bot_token" },
      create: { key: "telegram_bot_token", value: data.telegram_bot_token, updatedByUserId: actorUserId },
      update: { value: data.telegram_bot_token, updatedByUserId: actorUserId },
    });
    await audit({
      actorUserId,
      action: "update",
      entity: "Setting",
      entityId: "telegram_bot_token",
      before: { key: "telegram_bot_token", value: maskToken(prevToken) },
      after: { key: "telegram_bot_token", value: maskToken(data.telegram_bot_token) },
    });

    // telegram_chat_ids
    await prisma.setting.upsert({
      where: { key: "telegram_chat_ids" },
      create: { key: "telegram_chat_ids", value: data.telegram_chat_ids, updatedByUserId: actorUserId },
      update: { value: data.telegram_chat_ids, updatedByUserId: actorUserId },
    });
    await audit({
      actorUserId,
      action: "update",
      entity: "Setting",
      entityId: "telegram_chat_ids",
      before: { key: "telegram_chat_ids", value: currentValues["telegram_chat_ids"] },
      after: { key: "telegram_chat_ids", value: data.telegram_chat_ids },
    });
  } catch {
    return { success: false, error: "Ошибка при сохранении настроек" };
  }

  return { success: true };
}
