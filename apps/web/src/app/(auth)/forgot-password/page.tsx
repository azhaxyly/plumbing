/**
 * Forgot password page — sends a reset link to the provided email.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  description: "Получите ссылку для сброса пароля",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Восстановление пароля
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Введите email, и мы отправим ссылку для сброса пароля
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-600 hover:text-blue-500">
          ← Вернуться к входу
        </Link>
      </p>
    </div>
  );
}
