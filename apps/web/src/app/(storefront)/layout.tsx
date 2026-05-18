import { CookiesBanner } from "@/components/cookies-banner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookiesBanner />
    </div>
  );
}
