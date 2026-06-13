import type {
  TelegramProvider,
  TelegramMessageOptions,
  OrderNotificationPayload,
} from "@timsan/domain";

export interface TelegramConfig {
  botToken: string;
  adminBaseUrl: string; // базовый URL для ссылок в админку, например https://example.kz
}

export class HttpTelegramProvider implements TelegramProvider {
  private readonly apiBase: string;

  constructor(config: TelegramConfig) {
    this.apiBase = `https://api.telegram.org/bot${config.botToken}`;
  }

  async sendMessage(
    chatId: string,
    text: string,
    options?: TelegramMessageOptions,
  ): Promise<{ messageId: number }> {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };

    if (options?.parseMode) {
      body["parse_mode"] = options.parseMode;
    }
    if (options?.replyMarkup) {
      body["reply_markup"] = {
        inline_keyboard: options.replyMarkup.inlineKeyboard.map((row) =>
          row.map((btn) => ({
            text: btn.text,
            ...(btn.callbackData ? { callback_data: btn.callbackData } : {}),
            ...(btn.url ? { url: btn.url } : {}),
          })),
        ),
      };
    }
    if (options?.disableWebPagePreview) {
      body["disable_web_page_preview"] = true;
    }

    const response = await fetch(`${this.apiBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as { ok: boolean; result: { message_id: number } };
    return { messageId: data.result.message_id };
  }

  async sendOrderNotification(
    chatIds: string[],
    payload: OrderNotificationPayload,
  ): Promise<void> {
    const text = this.buildOrderMessage(payload);
    const options: TelegramMessageOptions = {
      parseMode: "HTML",
      disableWebPagePreview: true,
      replyMarkup: {
        inlineKeyboard: [
          [
            {
              text: "✅ Подтвердить",
              callbackData: `order:confirm:${payload.orderId}`,
            },
            {
              text: "❌ Отменить",
              callbackData: `order:cancel:${payload.orderId}`,
            },
          ],
          [
            {
              text: "🔗 Открыть в админке",
              url: payload.adminUrl,
            },
          ],
        ],
      },
    };

    await Promise.all(
      chatIds.map((chatId) =>
        this.sendMessage(chatId, text, options).catch((err: unknown) => {
          console.error(`Failed to send Telegram message to ${chatId}:`, err);
        }),
      ),
    );
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    const body: Record<string, unknown> = {
      callback_query_id: callbackQueryId,
    };
    if (text) {
      body["text"] = text;
    }

    const response = await fetch(`${this.apiBase}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }
  }

  private buildOrderMessage(payload: OrderNotificationPayload): string {
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
      `📧 <b>Email:</b> ${escapeHtml(payload.customerEmail)}`,
      `📍 <b>Адрес:</b> ${escapeHtml(payload.shippingAddress)}`,
      `💳 <b>Оплата:</b> ${escapeHtml(payload.paymentMethod)}`,
      payload.notes ? `💬 <b>Комментарий:</b> ${escapeHtml(payload.notes)}` : null,
      ``,
      `<b>Заказ:</b>`,
      itemsText,
      ``,
      `<b>Итого: ${totalKzt} ₸</b>`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
