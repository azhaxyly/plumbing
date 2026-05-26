"use client";

import { LogOut, Menu } from "lucide-react";
import { useTransition } from "react";

import { logoutAction } from "@/lib/auth-actions";

interface AdminHeaderProps {
  userName: string;
  userRole: string;
  onMenuOpen: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminHeader({ userName, userRole, onMenuOpen }: AdminHeaderProps) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  const roleLabel = userRole === "admin" ? "Администратор" : "Менеджер";
  const initials = getInitials(userName) || "А";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white px-4 shadow-sm">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
        aria-label="Открыть меню"
        onClick={onMenuOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo / title — visible on mobile when sidebar is hidden */}
      <span className="text-base font-semibold text-gray-900 lg:hidden">
        Timsan Admin
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info + logout */}
      <div className="flex items-center gap-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-gray-900">{userName}</span>
            <span className="text-xs text-gray-500">{roleLabel}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Logout */}
        <button
          type="button"
          aria-label="Выйти из системы"
          onClick={handleLogout}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>
    </header>
  );
}
