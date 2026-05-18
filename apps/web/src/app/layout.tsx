import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Whitehouse",
    default: "Whitehouse — Сантехника и мебель для ванной",
  },
  description:
    "Интернет-магазин сантехники и мебели для ванной комнаты. Широкий выбор, доставка по Казахстану, оплата через Kaspi.",
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
