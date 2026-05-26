"use client";

/**
 * Login form — client component using useActionState for Server Action.
 */
import { Button, Input } from "@timsan/ui";
import { useActionState } from "react";

import type { ActionResult } from "@/lib/auth-actions";
import { loginAction } from "@/lib/auth-actions";

interface LoginFormProps {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}

const initialState: ActionResult = { success: false };

export function LoginForm({ searchParams: _searchParams }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

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

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Пароль
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
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

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Вход..." : "Войти"}
      </Button>
    </form>
  );
}
