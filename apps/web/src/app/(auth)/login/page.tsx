/**
 * Login page — email + password form with Server Action.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход",
  description: "Войдите в свой аккаунт",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Вход в аккаунт
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>

      <LoginForm searchParams={searchParams} />

      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-blue-600 hover:text-blue-500"
        >
          Забыли пароль?
        </Link>
      </p>
    </div>
  );
}
