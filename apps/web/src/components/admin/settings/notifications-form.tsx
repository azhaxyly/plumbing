"use client";

/**
 * NotificationsForm — Client Component for editing notification settings.
 *
 * Fields:
 *   - owner_emails: textarea (one email per line → JSON array)
 *   - telegram_bot_token: password input with show/hide toggle
 *   - telegram_chat_ids: textarea (one chat ID per line → JSON array)
 *
 * Calls the saveNotificationSettings Server Action on submit.
 * Shows success/error feedback.
 *
 * See task 28.2.
 */

import { cn } from "@timsan/ui";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";


import { saveNotificationSettings } from "@/app/(admin)/admin/settings/actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonArrayToLines(jsonStr: string): string {
  if (!jsonStr) return "";
  try {
    const arr = JSON.parse(jsonStr) as unknown[];
    if (Array.isArray(arr)) {
      return arr.join("\n");
    }
  } catch {
    // ignore
  }
  return jsonStr;
}

function linesToJsonArray(text: string): string {
  const items = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return JSON.stringify(items);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationsFormProps {
  initialValues: {
    owner_emails: string;
    telegram_bot_token: string;
    telegram_chat_ids: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsForm({ initialValues }: NotificationsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const [ownerEmailsText, setOwnerEmailsText] = useState(
    jsonArrayToLines(initialValues.owner_emails),
  );
  const [telegramToken, setTelegramToken] = useState(
    initialValues.telegram_bot_token,
  );
  const [chatIdsText, setChatIdsText] = useState(
    jsonArrayToLines(initialValues.telegram_chat_ids),
  );

  function handleChange() {
    setSuccess(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    const payload = {
      owner_emails: linesToJsonArray(ownerEmailsText),
      telegram_bot_token: telegramToken,
      telegram_chat_ids: linesToJsonArray(chatIdsText),
    };

    startTransition(async () => {
      const result = await saveNotificationSettings(payload);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Неизвестная ошибка");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* owner_emails */}
      <div className="space-y-1.5">
        <label htmlFor="owner_emails" className="block text-sm font-medium text-gray-700">
          Email-адреса для уведомлений
        </label>
        <p className="text-xs text-gray-500">Каждый адрес — на отдельной строке.</p>
        <textarea
          id="owner_emails"
          rows={4}
          value={ownerEmailsText}
          onChange={(e) => { setOwnerEmailsText(e.target.value); handleChange(); }}
          disabled={isPending}
          placeholder={"admin@example.com\nowner@example.com"}
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y font-mono",
          )}
        />
      </div>

      {/* telegram_bot_token */}
      <div className="space-y-1.5">
        <label htmlFor="telegram_bot_token" className="block text-sm font-medium text-gray-700">
          Telegram Bot Token
        </label>
        <p className="text-xs text-gray-500">Получите токен у @BotFather в Telegram.</p>
        <div className="relative">
          <input
            id="telegram_bot_token"
            type={showToken ? "text" : "password"}
            value={telegramToken}
            onChange={(e) => { setTelegramToken(e.target.value); handleChange(); }}
            disabled={isPending}
            placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
            autoComplete="off"
            className={cn(
              "block w-full rounded-md border border-input bg-background px-3 py-2 pr-28 text-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "font-mono",
            )}
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            disabled={isPending}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500",
              "hover:bg-gray-100 hover:text-gray-700",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            aria-label={showToken ? "Скрыть токен" : "Показать токен"}
          >
            {showToken ? (
              <><EyeOff className="h-3.5 w-3.5" /> Скрыть</>
            ) : (
              <><Eye className="h-3.5 w-3.5" /> Показать</>
            )}
          </button>
        </div>
      </div>

      {/* telegram_chat_ids */}
      <div className="space-y-1.5">
        <label htmlFor="telegram_chat_ids" className="block text-sm font-medium text-gray-700">
          Telegram Chat ID
        </label>
        <p className="text-xs text-gray-500">
          Каждый ID — на отдельной строке. Для групп/каналов ID начинается с «-100».
        </p>
        <textarea
          id="telegram_chat_ids"
          rows={3}
          value={chatIdsText}
          onChange={(e) => { setChatIdsText(e.target.value); handleChange(); }}
          disabled={isPending}
          placeholder={"-100123456789\n987654321"}
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y font-mono",
          )}
        />
      </div>

      {/* Feedback */}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Настройки уведомлений успешно сохранены.
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Сохранить
        </button>
      </div>
    </form>
  );
}
