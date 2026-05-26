import type { Metadata } from "next";
import { Geologica } from "next/font/google";
import "./globals.css";

const geologica = Geologica({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-geologica",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Timsan",
    default: "Timsan — Сантехника и мебель для ванной",
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
    <html lang="ru" className={geologica.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
