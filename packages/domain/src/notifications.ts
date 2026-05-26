/**
 * Notification system interfaces and types.
 * Defines contracts for email, Telegram, and SMS providers
 * used to notify the shop owner about new orders.
 */

// ---------------------------------------------------------------------------
// Notification channel
// ---------------------------------------------------------------------------

export type NotificationChannel = "email" | "telegram" | "sms";

// ---------------------------------------------------------------------------
// Order notification payload
// ---------------------------------------------------------------------------

export interface OrderNotificationPayload {
  /** Internal order UUID */
  orderId: string;
  /** Human-readable order number (e.g. "ORD-0042") */
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    /** Price per unit in tiyin (1 KZT = 100 tiyin) */
    unitPriceCents: number;
    imageUrl?: string;
  }>;
  /** Order total in tiyin */
  totalCents: number;
  shippingAddress: string;
  paymentMethod: string;
  notes?: string;
  /** Direct deep-link to this order in the admin panel */
  adminUrl: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Email provider
// ---------------------------------------------------------------------------

export interface EmailProvider {
  /**
   * Send a raw HTML/text email.
   * @param to      List of recipient addresses
   * @param subject Email subject line
   * @param html    HTML body
   * @param text    Plain-text fallback (optional)
   */
  send(to: string[], subject: string, html: string, text?: string): Promise<void>;

  /**
   * Send a pre-formatted order notification email.
   * The provider is responsible for rendering the template.
   */
  sendOrderNotification(to: string[], payload: OrderNotificationPayload): Promise<void>;
}

// ---------------------------------------------------------------------------
// Telegram types
// ---------------------------------------------------------------------------

export interface TelegramInlineKeyboardButton {
  text: string;
  callbackData?: string;
  url?: string;
}

export interface TelegramInlineKeyboard {
  inlineKeyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramMessageOptions {
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  replyMarkup?: TelegramInlineKeyboard;
  disableWebPagePreview?: boolean;
}

// ---------------------------------------------------------------------------
// Telegram provider
// ---------------------------------------------------------------------------

export interface TelegramProvider {
  /**
   * Send a text message to a single chat.
   * @returns Object containing the Telegram message ID
   */
  sendMessage(
    chatId: string,
    text: string,
    options?: TelegramMessageOptions,
  ): Promise<{ messageId: number }>;

  /**
   * Send a pre-formatted order notification to multiple chats.
   * The provider is responsible for rendering the message text and inline buttons.
   */
  sendOrderNotification(chatIds: string[], payload: OrderNotificationPayload): Promise<void>;

  /**
   * Acknowledge a callback query (e.g. after an inline button press).
   * @param callbackQueryId  The callback_query.id from the Telegram update
   * @param text             Optional toast text shown to the user
   */
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// SMS provider (optional, for future use)
// ---------------------------------------------------------------------------

export interface SmsProvider {
  /**
   * Send a plain-text SMS.
   * @param to   Recipient phone number in E.164 format (e.g. "+77001234567")
   * @param text Message body
   */
  send(to: string, text: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Notification result
// ---------------------------------------------------------------------------

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  /** Error message if success is false */
  error?: string;
}
