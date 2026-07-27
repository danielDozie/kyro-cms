import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalDocs?: number;
  limit?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function Pagination({ page, totalPages, totalDocs, limit, onPageChange, onLimitChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="surface-tile flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--kyro-border)] rounded-lg">
      {totalDocs !== undefined && limit ? (
        <span className="text-xs text-[var(--kyro-text-secondary)] font-medium">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalDocs)} of {totalDocs}
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="text-xs border border-[var(--kyro-border)] rounded-lg px-2 py-1 bg-[var(--kyro-bg)] text-[var(--kyro-text-secondary)]"
          >
            <option value={10}>10/page</option>
            <option value={25}>25/page</option>
            <option value={50}>50/page</option>
            <option value={100}>100/page</option>
          </select>
        )}
        <span className="text-xs text-[var(--kyro-text-secondary)] font-medium">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
