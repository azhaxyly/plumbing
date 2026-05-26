"use client";

/**
 * Forgot password form — client component using useActionState.
 */
import { Button, Input } from "@timsan/ui";
import { useActionState } from "react";

import { forgotPasswordAction } from "@/lib/auth-actions";
import type { ActionResult } from "@/lib/auth-actions";

const initialState: ActionResult = { success: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
        Если аккаунт с таким email существует, мы отправили ссылку для сброса
        пароля. Проверьте почту.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-describedby={
            state.fieldErrors?.["email"] ? "email-error" : undefined
          }
        />
        {state.fieldErrors?.["email"] && (
          <p id="email-error" className="text-xs text-red-600">
            {state.fieldErrors["email"][0]}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Отправка..." : "Отправить ссылку"}
      </Button>
    </form>
  );
}
