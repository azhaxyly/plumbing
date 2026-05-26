import { cn } from "@timsan/ui";

export type OrderStatus = "new" | "confirmed" | "delivered" | "cancelled";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; dotClass: string; className: string }
> = {
  new: {
    label: "Новый",
    dotClass: "bg-blue-500",
    className: "bg-blue-100 text-blue-700",
  },
  confirmed: {
    label: "Подтверждён",
    dotClass: "bg-yellow-500",
    className: "bg-yellow-100 text-yellow-700",
  },
  delivered: {
    label: "Доставлен",
    dotClass: "bg-green-500",
    className: "bg-green-100 text-green-700",
  },
  cancelled: {
    label: "Отменён",
    dotClass: "bg-red-500",
    className: "bg-red-100 text-red-700",
  },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    dotClass: "bg-gray-400",
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)} />
      {config.label}
    </span>
  );
}
