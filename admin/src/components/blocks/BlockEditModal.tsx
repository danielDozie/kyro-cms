import { isStudioEnabled } from "../../lib/config";
import React, { useState, useId } from "react";
import { LayoutControls, supportsLayoutControls } from "../fields/LayoutControls";
import { BlockPickerIcon } from "../ui/BlockDrawer";
import { blockIcons } from "../fields/extensions/blockComponents";
import "./BlockEditTabs.css";
import { useBlockById, useBlockActions } from "../fields/extensions/blocksStore";
import { SlidePanel } from "../ui/SlidePanel";
import { ChildBlocksTree } from "./ChildBlocksTree";
import { FieldRenderer } from "../FieldRenderer";
import type { BlockData } from "@kyro-cms/core/client";

interface BlockEditModalProps {
  block: Record<string, any>;
  blockSchema?: Record<string, any>;
  onClose: () => void;
}

export const BlockEditModal: React.FC<BlockEditModalProps> = ({ block, blockSchema, onClose }) => {
  const [tab, setTab] = useState("Content");
  const tabId = useId();
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
            if (field.name === "layout" && supportsLayoutControls(field.fields)) {
              if (!isStudioEnabled || tab === "Content") return null;
              return (
                <LayoutControls
                  key={field.name}
                  hidePreview
                  context={tab as "Design" | "Misc"}
                  fields={field.fields}
                  value={data.layout || {}}
                  onChange={(value) => handleChange("layout", value)}
                />
              );
            }
            const category =
              field.admin?.editorTab ||
              (["style", "appearance", "design"].includes(field.name)
                ? "Design"
                : ["htmlId", "cssClasses", "customCss", "visibility"].includes(field.name)
                  ? "Misc"
                  : "Content");
            if (category !== tab || (!isStudioEnabled && category !== "Content")) return null;
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

            const value = field.name === "children" ? children : data[field.name];
            return (
              <div
                key={field.name}
                className="kyro-block-field-row border-b border-[var(--kyro-border)]/30 pb-3 last:border-b-0 last:pb-0"
              >
                <FieldRenderer field={field} value={value} onChange={(val) => field.name === "children" ? handleUpdateChildren(val as BlockData[]) : handleChange(field.name, val)} />
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


  return (
    <SlidePanel
      open={true}
      onClose={onClose}
      title={`Edit ${blockSchema?.label || block.type}`}
      headerDetail={
        <div className="block-header-summary">
          <BlockDiagram type={block.type} direction={data.layout?.direction} />
          <span>
            {["section", "container", "column", "row", "grid"].includes(block.type)
              ? block.type === "grid"
                ? "Arrange items in a grid."
                : (data.layout?.direction || (block.type === "row" ? "row" : "column")) === "row"
                  ? "Place items side by side."
                  : "Stack items vertically."
              : blockSchema?.admin?.description || "Edit this component’s content and settings."}
          </span>
        </div>
      }
      width="xl"
      showOverlay={false}
      accentClass="border-[var(--kyro-primary)]"
    >
      <div className="block-edit-tabs" role="tablist" aria-label="Block settings">
        {(isStudioEnabled ? ["Content", "Design", "Misc"] : ["Content"]).map((name) => (
          <button
            type="button"
            key={name}
            id={`${tabId}-${name}`}
            role="tab"
            aria-selected={tab === name}
            aria-controls={`${tabId}-panel`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
            onKeyDown={(event) => {
              const names = isStudioEnabled ? ["Content", "Design", "Misc"] : ["Content"];
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? names.length - 1
                    : (names.indexOf(name) + (event.key === "ArrowRight" ? 1 : names.length - 1)) % names.length;
              setTab(names[next]);
              document.getElementById(`${tabId}-${names[next]}`)?.focus();
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`} className="space-y-4">
        {renderFields()}

        {tab === "Content" && !blockSchema?.fields?.some((field: any) => field.name === "children") && children.length > 0 && (
          <div className="pt-4 border-t border-[var(--kyro-border)]">
            <label className="text-[10px] font-medium text-[var(--kyro-text-muted)] mb-1.5 block">
              Children ({children.length})
            </label>
            <ChildBlocksTree blockId={block.id} children={children} onUpdateChildren={handleUpdateChildren} />
          </div>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-[var(--kyro-border)]">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </div>
    </SlidePanel>
  );
};

function BlockDiagram({ type, direction }: { type: string; direction?: string }) {
  if (!["section", "container", "column", "row", "grid"].includes(type))
    return <BlockPickerIcon>{blockIcons[type]}</BlockPickerIcon>;
  const horizontal = (direction || (type === "row" ? "row" : "column")) === "row";
  return (
    <svg
      width="40"
      height="28"
      viewBox="0 0 84 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="80" height="48" rx="4" opacity=".5" />
      {(type === "grid" ? [0, 1, 2, 3] : [0, 1, 2]).map((index) => (
        <rect
          key={index}
          x={type === "grid" ? 9 + (index % 2) * 35 : horizontal ? 9 + index * 23 : 9}
          y={type === "grid" ? 8 + Math.floor(index / 2) * 20 : horizontal ? 9 : 8 + index * 13}
          width={type === "grid" ? 30 : horizontal ? 19 : 66}
          height={type === "grid" ? 15 : horizontal ? 34 : 9}
          rx="2"
        />
      ))}
    </svg>
  );
}
