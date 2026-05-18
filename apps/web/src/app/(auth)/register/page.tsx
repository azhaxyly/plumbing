/**
 * Registration page — email + password + ПДн consent.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Создайте аккаунт",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Создать аккаунт
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Войти
          </Link>
        </p>
      </div>

      <RegisterForm />
    </div>
  );
}
