import { auth } from "@/auth";
import { CookiesBanner } from "@/components/cookies-banner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { FavoritesProvider } from "@/contexts/favorites-context";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  let initialFavoriteIds: string[] = [];
  if (userId) {
    try {
      const { prisma } = await import("@timsan/db");
      const rows = await prisma.favorite.findMany({
        where: { userId },
        select: { productId: true },
        orderBy: { createdAt: "desc" },
      });
      initialFavoriteIds = rows.map((r) => r.productId);
    } catch {
      // Non-critical — fall back to empty
    }
  }

  return (
    <FavoritesProvider
      initialProductIds={initialFavoriteIds}
      isAuthenticated={!!userId}
    >
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookiesBanner />
      </div>
    </FavoritesProvider>
  );
}
