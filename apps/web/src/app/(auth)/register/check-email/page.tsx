import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Подтвердите email",
  robots: { index: false, follow: false },
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <Mail className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Проверьте почту
        </h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          Мы отправили письмо с подтверждением на{" "}
          {email ? (
            <span className="font-medium text-gray-900">{email}</span>
          ) : (
            "ваш email"
          )}
          .<br />
          Перейдите по ссылке в письме, чтобы активировать аккаунт.
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Не получили письмо? Проверьте папку «Спам».
      </p>

      <div className="pt-2">
        <Link
          href="/login"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Вернуться ко входу
        </Link>
      </div>
    </div>
  );
}
