import { prisma } from "@timsan/db";
import { env } from "@timsan/shared/env";

import { NodemailerEmailProvider } from "./email/nodemailer-email-provider";
import { NotificationService } from "./notification-service";
import { HttpTelegramProvider } from "./telegram/telegram-provider";

export async function createNotificationService(): Promise<NotificationService> {
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

  const ownerEmails = getSetting("owner_emails") ?? env.OWNER_EMAILS;
  const telegramBotToken = getSetting("telegram_bot_token") ?? env.TELEGRAM_BOT_TOKEN;
  const telegramChatIds = getSetting("telegram_chat_ids") ?? env.TELEGRAM_CHAT_IDS;
  const emailEnabled = getSetting("notifications_email_enabled") !== "false";
  const telegramEnabled = getSetting("notifications_telegram_enabled") !== "false";

  const emailProvider = new NodemailerEmailProvider({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  });

  const telegramProvider = telegramBotToken
    ? new HttpTelegramProvider({
        botToken: telegramBotToken,
        adminBaseUrl: env.NEXT_PUBLIC_SITE_URL,
      })
    : null;

  return new NotificationService({
    ...(ownerEmails
      ? {
          email: {
            provider: emailProvider,
            recipients: ownerEmails
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean),
            enabled: emailEnabled,
          },
        }
      : {}),
    ...(telegramProvider && telegramChatIds
      ? {
          telegram: {
            provider: telegramProvider,
            chatIds: telegramChatIds
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean),
            enabled: telegramEnabled,
          },
        }
      : {}),
  });
}
