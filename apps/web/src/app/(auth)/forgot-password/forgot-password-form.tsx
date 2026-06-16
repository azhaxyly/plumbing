"use client";

/**
 * Forgot password form — client component using useActionState.
 */
import { Button, Input } from "@timsan/ui";
import { useActionState, useRef, useState } from "react";

import { forgotPasswordAction } from "@/lib/auth-actions";
import type { ActionResult } from "@/lib/auth-actions";

const initialState: ActionResult = { success: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState,
  );
  const [submittedEmail, setSubmittedEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  if (state.success) {
    return (
      <div className="space-y-3 rounded-md bg-green-50 p-4 text-sm text-green-800">
        <p>
          Если почта{" "}
          <span className="font-semibold">{submittedEmail}</span>{" "}
          привязана к аккаунту, ссылка для сброса пароля уже в пути.
        </p>
        <p className="text-green-700">
          Проверьте папку «Входящие» и «Спам». Ссылка действует 1 час.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={() => setSubmittedEmail(emailRef.current?.value ?? "")}
    >
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
          ref={emailRef}
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
