import React from "react";
import { ChildBlocksTree } from "../blocks/ChildBlocksTree";
import type { BlockData } from "@kyro-cms/core/client";

interface ChildrenFieldProps {
  blockId: string;
  children: BlockData[];
  onUpdateChildren: (newChildren: BlockData[]) => void;
  label?: string;
  compact?: boolean;
}

export const ChildrenField: React.FC<ChildrenFieldProps> = ({
  blockId,
  children,
  onUpdateChildren,
  label,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="pt-2 border-t border-[var(--kyro-border)]">
        <label className="text-[10px] font-medium text-[var(--kyro-text-muted)] mb-1.5 block">
          {label || `Children (${children.length})`}
        </label>
        <ChildBlocksTree
          blockId={blockId}
          children={children}
          onUpdateChildren={onUpdateChildren}
        />
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-[var(--kyro-border)]">
      <label className="text-xs font-medium text-[var(--kyro-text-muted)] mb-2 block">
        {label || `Children (${children.length})`}
      </label>
      <ChildBlocksTree
        blockId={blockId}
        children={children}
        onUpdateChildren={onUpdateChildren}
      />
    </div>
  );
};

export default ChildrenField;
