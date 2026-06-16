import type { Metadata } from "next";

import { FavoritesClient } from "./favorites-client";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Сохранённые товары",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
