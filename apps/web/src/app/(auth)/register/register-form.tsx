"use client";

/**
 * Registration form — client component using useActionState.
 * Includes ПДн consent checkbox (required by Kazakhstan law).
 */
import { Button, Input } from "@whitehouse/ui";
import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";

import type { ActionResult } from "@/lib/auth-actions";
import { registerAction } from "@/lib/auth-actions";

const initialState: ActionResult = { success: false };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
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

      {/* ПДн consent — required by Kazakhstan law on personal data protection */}
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <input
            id="pdnConsent"
            name="pdnConsent"
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-describedby={
              state.fieldErrors?.["pdnConsent"]
                ? "pdnConsent-error"
                : undefined
            }
          />
          <label htmlFor="pdnConsent" className="text-sm text-gray-600">
            Я согласен(а) на{" "}
            <Link
              href={"/privacy-policy/" as Route}
              className="text-blue-600 hover:text-blue-500 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              обработку персональных данных
            </Link>{" "}
            в соответствии с Законом РК «О персональных данных и их защите»
          </label>
        </div>
        {state.fieldErrors?.["pdnConsent"] && (
          <p id="pdnConsent-error" className="text-xs text-red-600">
            {state.fieldErrors["pdnConsent"][0]}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Регистрация..." : "Создать аккаунт"}
      </Button>
    </form>
  );
}
