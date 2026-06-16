"use client";

/**
 * UserRoleSelect — Client Component for inline role change.
 * Shows a select dropdown + confirm button.
 * Calls the changeUserRole Server Action.
 * See task 27.
 */
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { changeUserRole } from "@/app/(admin)/admin/users/actions";

type UserRole = "customer" | "manager" | "admin";

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Покупатель",
  manager: "Менеджер",
  admin: "Администратор",
};

interface UserRoleSelectProps {
  userId: string;
  currentRole: UserRole;
}

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setIsOpen(true);
    setSelectedRole(currentRole);
    setError(null);
  }

  function handleCancel() {
    setIsOpen(false);
    setError(null);
  }

  function handleConfirm() {
    if (selectedRole === currentRole) {
      setIsOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await changeUserRole(userId, selectedRole);
      if (result.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Неизвестная ошибка");
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
      >
        Сменить роль
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex items-center gap-1.5">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
          disabled={isPending}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Выберите роль"
        >
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "OK"
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
