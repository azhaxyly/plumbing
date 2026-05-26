"use client";

import { Store } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@timsan/ui";

import { AdminSidebarNav } from "./admin-sidebar";

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileDrawer({ open, onClose }: AdminMobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-left text-sm font-bold leading-tight">
                Timsan Admin
              </SheetTitle>
              <p className="text-xs text-gray-500">Панель управления</p>
            </div>
          </div>
        </SheetHeader>
        <AdminSidebarNav onNavigate={onClose} />
      </SheetContent>
    </Sheet>
  );
}
