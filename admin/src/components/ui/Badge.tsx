import type { ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  | "draft"
  | "published"
  | "scheduled"
  | "archived"
  | "active"
  | "inactive"
  | "pending"
  | "completed"
  | "cancelled";

interface BadgeProps {
  variant?: BadgeVariant;
  status?: BadgeVariant; // Alias for variant when used for statuses
  className?: string;
  children?: ReactNode;
  dot?: boolean;
}

const statusConfig: Record<string, { class: string; label?: string }> = {
  draft: { class: "bg-gray-100 text-gray-600", label: "Draft" },
  published: { class: "bg-green-100 text-green-700", label: "Published" },
  scheduled: { class: "bg-blue-100 text-blue-700", label: "Scheduled" },
  archived: { class: "bg-yellow-100 text-yellow-700", label: "Archived" },
  active: { class: "bg-green-100 text-green-700", label: "Active" },
  inactive: { class: "bg-gray-100 text-gray-600", label: "Inactive" },
  pending: { class: "bg-yellow-100 text-yellow-700", label: "Pending" },
  completed: { class: "bg-green-100 text-green-700", label: "Completed" },
  cancelled: { class: "bg-red-100 text-red-700", label: "Cancelled" },
};

export function Badge({
  variant,
  status,
  className = "",
  children,
  dot = false,
}: BadgeProps) {
  const activeVariant = variant || status || "default";
  const config = statusConfig[activeVariant];

  const variantClass = config 
    ? config.class 
    : `kyro-badge-${activeVariant}`;

  return (
    <span className={`kyro-badge ${variantClass} ${className}`}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-60" />
      )}
      {children || config?.label || activeVariant}
    </span>
  );
}

export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
      {count > max ? `${max}+` : count}
    </span>
  );
}

