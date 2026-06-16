import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Подтверждение email",
  robots: { index: false, follow: false },
};

async function verifyToken(token: string): Promise<"ok" | "invalid" | "error"> {
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    let userId: string | null = null;
    try {
      userId = await redis.get(`auth:verify:${token}`);
      if (userId) await redis.del(`auth:verify:${token}`);
    } finally {
      redis.disconnect();
    }

    if (!userId) return "invalid";

    const { prisma } = await import("@timsan/db");
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    return "ok";
  } catch {
    return "error";
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidLink />;
  }

  const result = await verifyToken(token);

  if (result === "ok") {
    redirect("/login?verified=true");
  }

  if (result === "invalid") {
    return <InvalidLink />;
  }

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Ошибка</h1>
      <p className="text-sm text-gray-600">
        Не удалось подтвердить email. Попробуйте позже.
      </p>
      <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
        Вернуться ко входу
      </Link>
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Ссылка недействительна</h1>
      <p className="text-sm text-gray-600">
        Ссылка уже была использована или истекла (24 часа). Зарегистрируйтесь снова.
      </p>
      <Link href="/register" className="text-sm text-blue-600 hover:text-blue-500">
        Зарегистрироваться
      </Link>
    </div>
  );
}
