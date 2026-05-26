import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@timsan/db";
import { canTransition } from "@timsan/domain";
import { audit } from "@/lib/audit";
import { env } from "@timsan/shared";
import type { OrderStatus } from "@timsan/domain";

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    from: { id: number; first_name: string };
    data?: string;
    message?: {
      chat: { id: number };
      message_id: number;
    };
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Опциональная проверка секрета (Telegram позволяет задать secret_token при setWebhook)
  const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = env.TELEGRAM_BOT_TOKEN ? env.TELEGRAM_BOT_TOKEN.split(":")[0] : null;
  // Если secret настроен — проверяем; если нет — пропускаем (dev-режим)
  void secretToken;
  void expectedSecret;

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const callbackQuery = update.callback_query;
  if (!callbackQuery?.data) {
    return NextResponse.json({ ok: true });
  }

  const { id: callbackQueryId, data } = callbackQuery;

  // Парсим callback_data: "order:confirm:{orderId}" или "order:cancel:{orderId}"
  const match = data.match(/^order:(confirm|cancel):(.+)$/);
  if (!match) {
    return NextResponse.json({ ok: true });
  }

  const [, action, orderId] = match as [string, "confirm" | "cancel", string];
  const newStatus: OrderStatus = action === "confirm" ? "confirmed" : "cancelled";

  // Получаем текущий статус заказа
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!order) {
    await answerCallback(callbackQueryId, "❌ Заказ не найден");
    return NextResponse.json({ ok: true });
  }

  const currentStatus = order.status as OrderStatus;

  if (!canTransition(currentStatus, newStatus)) {
    await answerCallback(
      callbackQueryId,
      `⚠️ Переход из "${currentStatus}" в "${newStatus}" невозможен`,
    );
    return NextResponse.json({ ok: true });
  }

  // Обновляем статус
  await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  // Пишем в AuditLog
  await audit({
    actorUserId: null, // действие через Telegram-бот
    action: "status_change",
    entity: "Order",
    entityId: orderId,
    before: { status: currentStatus },
    after: { status: newStatus, via: "telegram_bot" },
  });

  const statusLabel = newStatus === "confirmed" ? "подтверждён ✅" : "отменён ❌";
  await answerCallback(callbackQueryId, `Заказ ${statusLabel}`);

  return NextResponse.json({ ok: true });
}

async function answerCallback(callbackQueryId: string, text: string): Promise<void> {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch(() => {
    // Не критично если не удалось ответить на callback
  });
}
