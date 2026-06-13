/**
 * Login page — email + password form with Server Action.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход",
  description: "Войдите в свой аккаунт",
  robots: { index: false, follow: true },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8 md:p-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Добро пожаловать!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Войдите, чтобы продолжить покупки и отслеживать заказы.
        </p>
      </div>

      <div className="mt-8">
        <LoginForm searchParams={searchParams} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-accent transition-colors hover:text-accent/80"
        >
          Забыли пароль?
        </Link>
        <p className="text-muted-foreground">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="font-medium text-accent transition-colors hover:text-accent/80"
          >
            Создать
          </Link>
        </p>
      </div>
    </div>
  );
}
