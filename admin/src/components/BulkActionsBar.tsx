import React from "react";
import { Dropdown, DropdownItem, DropdownSeparator } from "./ui/Dropdown";
import { CountBadge } from "./ui/Badge";

interface BulkAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  onSelectAll?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  onSelectAll,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between py-2 px-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CountBadge count={selectedCount} />
          <span className="text-sm text-gray-600">selected</span>
        </div>
        <button type="button"
          onClick={onClearSelection}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear selection
        </button>
        {onSelectAll && (
          <button type="button"
            onClick={onSelectAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Select all
          </button>
        )}
      </div>

      <Dropdown
        trigger={
          <button type="button" className="kyro-btn kyro-btn-secondary kyro-btn-sm">
            Actions
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        }
      >
        {actions.map((action, index) => (
          <DropdownItem
            key={index}
            onClick={action.onClick}
            icon={action.icon as React.ReactElement}
            danger={action.danger}
          >
            {action.label}
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  );
}
