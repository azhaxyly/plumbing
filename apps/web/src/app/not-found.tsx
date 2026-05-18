import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="text-2xl font-semibold">Страница не найдена</h2>
      <p className="text-muted-foreground">
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        На главную
      </Link>
    </div>
  );
}
