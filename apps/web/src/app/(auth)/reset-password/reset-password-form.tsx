"use client";

/**
 * Reset password form — client component using useActionState.
 * Token is passed as a hidden field from the page.
 */
import { Button, Input } from "@whitehouse/ui";
import Link from "next/link";
import { useActionState } from "react";

import type { ActionResult } from "@/lib/auth-actions";
import { resetPasswordAction } from "@/lib/auth-actions";

interface ResetPasswordFormProps {
  token: string;
}

const initialState: ActionResult = { success: false };

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Пароль успешно изменён.
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-blue-600 hover:text-blue-500"
        >
          Войти с новым паролем
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden token field */}
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Новый пароль
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Не менее 8 символов"
          aria-describedby={
            state.fieldErrors?.["password"] ? "password-error" : undefined
          }
        />
        {state.fieldErrors?.["password"] && (
          <p id="password-error" className="text-xs text-red-600">
            {state.fieldErrors["password"][0]}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          Подтвердите пароль
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          aria-describedby={
            state.fieldErrors?.["confirmPassword"]
              ? "confirmPassword-error"
              : undefined
          }
        />
        {state.fieldErrors?.["confirmPassword"] && (
          <p id="confirmPassword-error" className="text-xs text-red-600">
            {state.fieldErrors["confirmPassword"][0]}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Сохранение..." : "Сохранить пароль"}
      </Button>
    </form>
  );
}
