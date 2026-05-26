import type { Metadata } from "next";
import { FavoritesClient } from "./favorites-client";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Сохранённые товары",
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
