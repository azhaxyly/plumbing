"use client";

import { Store } from "lucide-react";
import { useState } from "react";

import { AdminHeader } from "./admin-header";
import { AdminMobileDrawer } from "./admin-mobile-drawer";
import { AdminSidebarNav } from "./admin-sidebar";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
}

export function AdminLayoutClient({
  children,
  userName,
  userRole,
}: AdminLayoutClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — fixed, hidden on mobile */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-white lg:shadow-sm">
        {/* Sidebar logo */}
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">Timsan Admin</p>
            <p className="text-xs text-gray-500">Панель управления</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminSidebarNav />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AdminMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <AdminHeader
          userName={userName}
          userRole={userRole}
          onMenuOpen={() => setDrawerOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
