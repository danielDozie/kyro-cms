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
  | "cancelled"
  | "live"
  | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  status?: BadgeVariant;
  className?: string;
  children?: ReactNode;
  dot?: boolean;
}

const statusConfig: Record<string, { class: string; label?: string; dotClass?: string }> = {
  draft: { class: "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300", label: "Draft", dotClass: "bg-gray-400" },
  published: { class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", label: "Published", dotClass: "bg-emerald-500" },
  scheduled: { class: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", label: "Scheduled", dotClass: "bg-blue-500" },
  archived: { class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", label: "Archived", dotClass: "bg-amber-500" },
  active: { class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", label: "Active", dotClass: "bg-emerald-500" },
  live: { class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", label: "Live", dotClass: "bg-emerald-500" },
  inactive: { class: "bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400", label: "Inactive", dotClass: "bg-gray-400" },
  pending: { class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", label: "Pending", dotClass: "bg-amber-500" },
  completed: { class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", label: "Completed", dotClass: "bg-emerald-500" },
  cancelled: { class: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", label: "Cancelled", dotClass: "bg-red-500" },
  error: { class: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", label: "Error", dotClass: "bg-red-500" },
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
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config?.dotClass || "bg-current"} ${activeVariant === "live" || activeVariant === "active" ? "animate-pulse" : "opacity-60"}`} />
      )}
      {children || config?.label || activeVariant}
    </span>
  );
}

export function StatusDot({
  status = "live",
  pulse = true,
  className = "",
}: {
  status?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}) {
  const config = statusConfig[status] || statusConfig.active;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.class} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass || "bg-current"} ${pulse ? "animate-pulse" : ""}`} />
      <span>{config.label || status}</span>
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
