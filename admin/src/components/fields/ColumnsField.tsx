import React from "react";
import { ChildBlocksTree } from "../blocks/ChildBlocksTree";
import type { BlockData } from "@kyro-cms/core/client";

interface ColumnData {
  id: number;
  children: BlockData[];
}

interface ColumnsFieldProps {
  columns?: number;
  columnData?: ColumnData[];
  onColumnsChange: (columns: number) => void;
  onUpdateColumnChildren: (columnIndex: number, newChildren: BlockData[]) => void;
  compact?: boolean;
}

export const ColumnsField: React.FC<ColumnsFieldProps> = ({
  columns = 2,
  columnData = [],
  onColumnsChange,
  onUpdateColumnChildren,
  compact = false,
}) => {
  const normalizedColumnData = Array.from({ length: columns }, (_, i) => ({
    id: i,
    children: columnData[i]?.children || [],
  }));

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--kyro-text-muted)]">
            Columns:
          </span>
          <div className="flex items-center gap-0.5 bg-[var(--kyro-surface-accent)] rounded-lg p-0.5">
            {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onColumnsChange(n)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  columns === n
                    ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] shadow-sm"
                    : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-fit">
            {normalizedColumnData.map((col, i) => (
              <div
                key={i}
                className="w-[180px] border-2 border-dashed border-[var(--kyro-border)] rounded-lg p-2"
              >
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[var(--kyro-border)]">
                  <span className="text-[10px] font-medium text-[var(--kyro-text-muted)]">
                    Col {i + 1}
                  </span>
                  <span className="text-[10px] text-[var(--kyro-text-muted)]">
                    {col.children.length}
                  </span>
                </div>
                <ChildBlocksTree
                  blockId={`col-${i}`}
                  children={col.children}
                  onUpdateChildren={(c) => onUpdateColumnChildren(i, c)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--kyro-text-muted)]">
          Columns:
        </span>
        <div className="flex items-center gap-0.5 bg-[var(--kyro-surface-accent)] rounded-lg p-0.5">
          {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onColumnsChange(n)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                columns === n
                  ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] shadow-sm"
                  : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-3 min-w-fit"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(200px, 1fr))`,
          }}
        >
          {normalizedColumnData.map((col, i) => (
            <div
              key={i}
              className="border-2 border-dashed border-[var(--kyro-border)] rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--kyro-border)]">
                <span className="text-xs font-medium text-[var(--kyro-text-primary)]">
                  Column {i + 1}
                </span>
                <span className="text-[10px] text-[var(--kyro-text-muted)]">
                  {col.children.length} blocks
                </span>
              </div>
              <ChildBlocksTree
                blockId={`col-${i}`}
                children={col.children}
                onUpdateChildren={(c) => onUpdateColumnChildren(i, c)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColumnsField;
