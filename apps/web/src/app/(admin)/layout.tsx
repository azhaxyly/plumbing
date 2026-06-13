/**
 * Admin section layout — Server Component.
 * Reads the current session server-side and passes user info to the client wrapper.
 * RBAC is enforced by middleware (admin|manager roles only).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminLayoutClient } from "@/components/admin/admin-layout-client";

// Defense-in-depth alongside robots.txt: never index any admin route.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Double-check auth (middleware already handles this, but belt-and-suspenders)
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const user = session.user as { name?: string | null; email?: string | null; role?: string };
  const userName = user.name ?? user.email ?? "Пользователь";
  const userRole = user.role ?? "manager";

  return (
    <AdminLayoutClient userName={userName} userRole={userRole}>
      {children}
    </AdminLayoutClient>
  );
}
