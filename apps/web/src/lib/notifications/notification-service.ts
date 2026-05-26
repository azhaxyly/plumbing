import type {
  EmailProvider,
  TelegramProvider,
  SmsProvider,
  OrderNotificationPayload,
  NotificationResult,
} from "@timsan/domain";

export interface NotificationServiceConfig {
  email?: {
    provider: EmailProvider;
    recipients: string[]; // owner_emails из Setting
    enabled: boolean;
  };
  telegram?: {
    provider: TelegramProvider;
    chatIds: string[]; // telegram_chat_ids из Setting
    enabled: boolean;
  };
  sms?: {
    provider: SmsProvider;
    phone: string;
    enabled: boolean;
  };
}

export class NotificationService {
  constructor(private config: NotificationServiceConfig) {}

  /**
   * Fan-out: отправляет уведомление о новом заказе через все включённые каналы параллельно.
   * Падение одного канала логируется, но не прерывает остальные.
   * @returns массив результатов по каждому каналу
   */
  async notifyNewOrder(payload: OrderNotificationPayload): Promise<NotificationResult[]> {
    const tasks: Promise<NotificationResult>[] = [];

    if (this.config.email?.enabled && this.config.email.recipients.length > 0) {
      tasks.push(
        this.config.email.provider
          .sendOrderNotification(this.config.email.recipients, payload)
          .then(() => ({ channel: "email" as const, success: true }))
          .catch((err: unknown) => ({
            channel: "email" as const,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })),
      );
    }

    if (this.config.telegram?.enabled && this.config.telegram.chatIds.length > 0) {
      tasks.push(
        this.config.telegram.provider
          .sendOrderNotification(this.config.telegram.chatIds, payload)
          .then(() => ({ channel: "telegram" as const, success: true }))
          .catch((err: unknown) => ({
            channel: "telegram" as const,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })),
      );
    }

    if (this.config.sms?.enabled && this.config.sms.phone) {
      const text = `Новый заказ №${payload.orderNumber} на ${Math.round(payload.totalCents / 100).toLocaleString("ru-KZ")} ₸. Открыть: ${payload.adminUrl}`;
      tasks.push(
        this.config.sms.provider
          .send(this.config.sms.phone, text)
          .then(() => ({ channel: "sms" as const, success: true }))
          .catch((err: unknown) => ({
            channel: "sms" as const,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })),
      );
    }

    if (tasks.length === 0) {
      return [];
    }

    return Promise.all(tasks);
  }
}
