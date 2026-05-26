"use client";

/**
 * ShopContactsForm — Client Component for editing shop contact settings.
 *
 * Fields: Телефон, Email, Instagram, Юридическое название, БИН.
 * Calls the saveShopContacts Server Action on submit.
 * Shows success/error feedback.
 *
 * See task 28.1.
 */

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@timsan/ui";

import { saveShopContacts } from "@/app/(admin)/admin/settings/actions";

interface ShopContactsFormProps {
  initialValues: {
    shop_phone: string;
    shop_email: string;
    shop_instagram: string;
    shop_legal_name: string;
    shop_bin: string;
  };
}

export function ShopContactsForm({ initialValues }: ShopContactsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState({
    shop_phone: initialValues.shop_phone,
    shop_email: initialValues.shop_email,
    shop_instagram: initialValues.shop_instagram,
    shop_legal_name: initialValues.shop_legal_name,
    shop_bin: initialValues.shop_bin,
  });

  function handleChange(field: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    startTransition(async () => {
      const result = await saveShopContacts(values);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Неизвестная ошибка");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Телефон */}
      <div className="space-y-1.5">
        <label htmlFor="shop_phone" className="block text-sm font-medium text-gray-700">
          Телефон магазина
        </label>
        <input
          id="shop_phone"
          type="tel"
          value={values.shop_phone}
          onChange={(e) => handleChange("shop_phone", e.target.value)}
          disabled={isPending}
          placeholder="+7 (727) 000-00-00"
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="shop_email" className="block text-sm font-medium text-gray-700">
          Email магазина
        </label>
        <input
          id="shop_email"
          type="email"
          value={values.shop_email}
          onChange={(e) => handleChange("shop_email", e.target.value)}
          disabled={isPending}
          placeholder="info@example.com"
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {/* Instagram */}
      <div className="space-y-1.5">
        <label htmlFor="shop_instagram" className="block text-sm font-medium text-gray-700">
          Instagram (без @)
        </label>
        <div className="flex items-center">
          <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            @
          </span>
          <input
            id="shop_instagram"
            type="text"
            value={values.shop_instagram}
            onChange={(e) => handleChange("shop_instagram", e.target.value)}
            disabled={isPending}
            placeholder="Timsan_kz"
            className={cn(
              "block w-full rounded-r-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
      </div>

      {/* Юридическое название */}
      <div className="space-y-1.5">
        <label htmlFor="shop_legal_name" className="block text-sm font-medium text-gray-700">
          Юридическое название
        </label>
        <input
          id="shop_legal_name"
          type="text"
          value={values.shop_legal_name}
          onChange={(e) => handleChange("shop_legal_name", e.target.value)}
          disabled={isPending}
          placeholder='ТОО "Timsan"'
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {/* БИН */}
      <div className="space-y-1.5">
        <label htmlFor="shop_bin" className="block text-sm font-medium text-gray-700">
          БИН организации
        </label>
        <input
          id="shop_bin"
          type="text"
          value={values.shop_bin}
          onChange={(e) => handleChange("shop_bin", e.target.value)}
          disabled={isPending}
          placeholder="123456789012"
          maxLength={12}
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {/* Feedback */}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Контакты магазина успешно сохранены.
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
