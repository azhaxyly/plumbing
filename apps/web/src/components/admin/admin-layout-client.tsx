"use client";

import { Store } from "lucide-react";
import { useRef, useState } from "react";

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

  // Edge-swipe to open the drawer (mobile only): start near the left edge and
  // drag right. vaul handles drag-to-close once it's open.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if (drawerOpen || window.innerWidth >= 1024) return;
    const t = e.touches[0];
    if (t && t.clientX <= 24) {
      touchStart.current = { x: t.clientX, y: t.clientY };
    } else {
      touchStart.current = null;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    const start = touchStart.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    if (dx > 48 && dy < 40) {
      touchStart.current = null;
      setDrawerOpen(true);
    }
  }

  return (
    <div
      className="flex min-h-screen bg-slate-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
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
