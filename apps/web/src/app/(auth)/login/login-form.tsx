"use client";

/**
 * Login form — client component using useActionState for Server Action.
 */
import { Button, Input } from "@timsan/ui";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useActionState, useState } from "react";

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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-11 pl-10"
            aria-describedby={
              state.fieldErrors?.["email"] ? "email-error" : undefined
            }
          />
        </div>
        {state.fieldErrors?.["email"] && (
          <p id="email-error" className="text-xs text-destructive">
            {state.fieldErrors["email"][0]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground"
        >
          Пароль
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-11 pl-10 pr-10"
            aria-describedby={
              state.fieldErrors?.["password"] ? "password-error" : undefined
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {state.fieldErrors?.["password"] && (
          <p id="password-error" className="text-xs text-destructive">
            {state.fieldErrors["password"][0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="h-11 w-full text-base"
        disabled={isPending}
      >
        {isPending ? "Вход..." : "Войти"}
      </Button>
    </form>
  );
}
