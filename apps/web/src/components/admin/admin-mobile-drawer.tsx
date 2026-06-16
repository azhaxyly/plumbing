"use client";

import { Store } from "lucide-react";
import { Drawer } from "vaul";

import { AdminSidebarNav } from "./admin-sidebar";

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileDrawer({ open, onClose }: AdminMobileDrawerProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      direction="left"
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl outline-none"
          aria-describedby={undefined}
        >
          {/* Drag handle hint — thin bar on the right edge */}
          <div className="absolute right-1.5 top-1/2 h-12 w-1 -translate-y-1/2 rounded-full bg-gray-200" />

          <div className="border-b px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <Drawer.Title className="text-left text-sm font-bold leading-tight">
                  Timsan Admin
                </Drawer.Title>
                <p className="text-xs text-gray-500">Панель управления</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <AdminSidebarNav onNavigate={onClose} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
