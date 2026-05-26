"use client";

import { Button, Input } from "@timsan/ui";
import { useActionState } from "react";

import type { ActionResult } from "@/lib/auth-actions";
import { changePasswordAction } from "@/lib/account-actions";

const initialState: ActionResult = { success: false };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
          Пароль успешно изменён.
        </div>
      )}
      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="currentPassword" className="block text-sm font-medium text-stone-700">
          Текущий пароль
        </label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        {state.fieldErrors?.["currentPassword"] && (
          <p className="text-xs text-red-600">{state.fieldErrors["currentPassword"][0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700">
          Новый пароль
        </label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Минимум 8 символов"
        />
        {state.fieldErrors?.["newPassword"] && (
          <p className="text-xs text-red-600">{state.fieldErrors["newPassword"][0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700">
          Подтверждение пароля
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
        />
        {state.fieldErrors?.["confirmPassword"] && (
          <p className="text-xs text-red-600">{state.fieldErrors["confirmPassword"][0]}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Сохранение..." : "Изменить пароль"}
      </Button>
    </form>
  );
}
