/**
 * Reset password page — validates token from query param and sets new password.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Новый пароль",
  description: "Установите новый пароль",
  robots: { index: false, follow: true },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Недействительная ссылка
        </h1>
        <p className="text-sm text-gray-600">
          Ссылка для сброса пароля недействительна или истекла.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm text-blue-600 hover:text-blue-500"
        >
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Новый пароль
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Введите новый пароль для вашего аккаунта
        </p>
      </div>

      <ResetPasswordForm token={token} />
    </div>
  );
}
