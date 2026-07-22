import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { blockTheme } from "../fields/extensions/blockComponents";
import { SlidePanel } from "../ui/SlidePanel";
import { ChildBlocksTree } from "./ChildBlocksTree";
import { FieldRenderer } from "../FieldRenderer";
import type { BlockData } from "@kyro-cms/core/client";

interface BlockEditModalProps {
  block: Record<string, any>;
  blockSchema?: Record<string, any>;
  onClose: () => void;
}

export const BlockEditModal: React.FC<BlockEditModalProps> = ({
  block,
  blockSchema,
  onClose,
}) => {
  const blockData = useBlockById(block.id);
  const { updateBlock } = useBlockActions();
  const data = blockData?.data || block.data || {};
  const children = blockData?.children || block.children || [];

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  const handleUpdateChildren = (newChildren: BlockData[]) => {
    updateBlock(block.id, { children: newChildren });
  };

  const renderFields = () => {
    // If a schema is present, render all fields dynamically using FieldRenderer
    if (blockSchema && Array.isArray(blockSchema.fields)) {
      return (
        <div className="space-y-4 pt-2">
          {blockSchema.fields.map((field: any) => {
            // Evaluate condition if present
            if (field.admin?.condition) {
              if (typeof field.admin.condition === "function") {
                try {
                  // Compatibility wrapper: pass { values: data, ...data } to support both old and new signatures
                  const evalData = { values: data, ...data };
                  const shouldShow = field.admin.condition(evalData, evalData);
                  if (!shouldShow) return null;
                } catch (e) {
                  console.warn(`Condition error for field ${field.name}:`, e);
                }
              } else if (typeof field.admin.condition === "object") {
                try {
                  const cond = field.admin.condition as any;
                  const targetField = cond.field;
                  const val = data[targetField];
                  let shouldShow = true;
                  if ("equals" in cond) {
                    shouldShow = val === cond.equals;
                  } else if ("notEquals" in cond) {
                    shouldShow = val !== cond.notEquals;
                  } else if ("in" in cond && Array.isArray(cond.in)) {
                    shouldShow = cond.in.includes(val);
                  }
                  if (!shouldShow) return null;
                } catch (e) {
                  console.warn(`Declarative condition error for field ${field.name}:`, e);
                }
              }
            }

            const value = data[field.name];
            return (
              <div
                key={field.name}
                className="kyro-block-field-row border-b border-[var(--kyro-border)]/30 pb-3 last:border-b-0 last:pb-0"
              >
                <FieldRenderer
                  field={field}
                  value={value}
                  onChange={(val) => handleChange(field.name, val)}
                />
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback if no schema is provided (for safety with legacy records)
    return (
      <div className="text-center py-8 text-[var(--kyro-text-muted)] text-sm italic">
        No schema defined for block type "{block.type}"
      </div>
    );
  };

  const theme = blockTheme[block.type] || blockTheme.default;

  return (
    <SlidePanel
      open={true}
      onClose={onClose}
      title={`Edit ${blockSchema?.label || block.type}`}
      width="xl"
      showOverlay={false}
      accentClass={theme.border}
    >
      <div className="space-y-4">

        {renderFields()}

        {children.length > 0 && (
          <div className="pt-4 border-t border-[var(--kyro-border)]">
            <label className="text-[10px] font-medium text-[var(--kyro-text-muted)] mb-1.5 block">
              Children ({children.length})
            </label>
            <ChildBlocksTree
              blockId={block.id}
              children={children}
              onUpdateChildren={handleUpdateChildren}
            />
          </div>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-[var(--kyro-border)]">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </div>
    </SlidePanel>
  );
};
