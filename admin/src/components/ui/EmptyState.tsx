import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 justify-center py-16 px-8">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[var(--kyro-surface-accent)] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <p className="font-medium text-[var(--kyro-text-primary)] text-base">{title}</p>
      {description && (
        <p className="text-sm text-[var(--kyro-text-secondary)] mt-1">{description}</p>
      )}
      {action}
    </div>
  );
}
