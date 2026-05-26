"use client";

/**
 * UserBlockButton — Client Component for blocking/unblocking a user.
 * Shows a confirmation dialog before blocking.
 * Calls the toggleUserBlock Server Action.
 * See task 27.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { toggleUserBlock } from "@/app/(admin)/admin/users/actions";

interface UserBlockButtonProps {
  userId: string;
  isBlocked: boolean;
}

export function UserBlockButton({ userId, isBlocked }: UserBlockButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isBlocked) {
      // Show confirmation before blocking
      setConfirming(true);
      setError(null);
    } else {
      // Unblock immediately without confirmation
      execute(false);
    }
  }

  function handleConfirmBlock() {
    execute(true);
  }

  function handleCancelBlock() {
    setConfirming(false);
    setError(null);
  }

  function execute(block: boolean) {
    startTransition(async () => {
      const result = await toggleUserBlock(userId, block);
      if (result.success) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(result.error ?? "Неизвестная ошибка");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1.5">
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-600">Заблокировать?</span>
          <button
            type="button"
            onClick={handleConfirmBlock}
            disabled={isPending}
            className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Да"
            )}
          </button>
          <button
            type="button"
            onClick={handleCancelBlock}
            disabled={isPending}
            className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Нет
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          isBlocked
            ? "rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            : "rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isBlocked ? (
          "Разблокировать"
        ) : (
          "Заблокировать"
        )}
      </button>
    </div>
  );
}
