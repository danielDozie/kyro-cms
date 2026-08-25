import "../../lib/i18n";
import React, { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "../ui/icons";
import { useTranslation } from "react-i18next";

export interface AccordionItem {
  title: string;
  content: string;
}

interface AccordionFieldProps {
  items?: AccordionItem[];
  onChange: (items: AccordionItem[]) => void;
  compact?: boolean;
}

export const AccordionField: React.FC<AccordionFieldProps> = ({
  items = [],
  onChange,
  compact = false,
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const headerControls = (
    <div className="flex justify-end gap-1 mb-2">
    </div>
  );

  const handleTitleChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], title: value };
    onChange(newItems);
  };

  const handleContentChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], content: value };
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
    if (openIndex === index) setOpenIndex(null);
    else if (openIndex !== null && openIndex > index)
      setOpenIndex(openIndex - 1);
  };

  const handleAdd = () => {
    onChange([...items, { title: `Item ${items.length + 1}`, content: "" }]);
    setOpenIndex(items.length);
  };

  const baseInputClass =
    "w-full px-3 py-2 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";
  const smallInputClass =
    "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  if (compact) {
    return (
      <div className="space-y-2">
        {headerControls}
        {items.length === 0 ? (
          <div className="text-center py-4 text-[var(--kyro-text-muted)] text-sm border border-dashed border-[var(--kyro-border)] rounded-md">
            No items. Click "Add Item" to create one.
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item: AccordionItem, index: number) => {
                const { t } = useTranslation();
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="border border-[var(--kyro-border)] rounded-lg overflow-hidden group"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-2.5 bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-sidebar-active)]/10 transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--kyro-text-primary)] truncate">
                      {item.title || `Item ${index + 1}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(index);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--kyro-danger-bg)] rounded text-[var(--kyro-error)] transition-opacity"
                        title={t("tooltips.remove", { defaultValue: "Remove" })}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[var(--kyro-text-muted)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--kyro-text-muted)]" />
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="p-2.5 bg-[var(--kyro-surface)] space-y-2">
                      <input
                        type="text"
                        value={item.title || ""}
                        onChange={(e) =>
                          handleTitleChange(index, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className={smallInputClass}
                        placeholder={t("fields.itemTitle", { defaultValue: "Item title..." })}
                      />
                      <textarea
                        value={item.content || ""}
                        onChange={(e) =>
                          handleContentChange(index, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className={`${smallInputClass} min-h-[60px] resize-none`}
                        placeholder={t("fields.itemContent", { defaultValue: "Item content..." })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:border-[var(--kyro-sidebar-active)] hover:text-[var(--kyro-text-primary)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {headerControls}
      {items.length === 0 ? (
        <div className="text-center py-4 text-[var(--kyro-text-muted)] text-sm border border-dashed border-[var(--kyro-border)] rounded-md">
          No items. Click "Add Item" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: AccordionItem, index: number) => {
              const { t } = useTranslation();
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="border border-[var(--kyro-border)] rounded-lg overflow-hidden group"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-3 bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-sidebar-active)]/10 transition-colors"
                >
                  <span className="text-sm font-medium text-[var(--kyro-text-primary)] truncate">
                    {item.title || `Item ${index + 1}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[var(--kyro-danger-bg)] rounded text-[var(--kyro-error)] transition-opacity"
                      title={t("tooltips.remove", { defaultValue: "Remove" })}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[var(--kyro-text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--kyro-text-muted)]" />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="p-3 bg-[var(--kyro-surface)] space-y-2">
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(e) => handleTitleChange(index, e.target.value)}
                      className={baseInputClass}
                      placeholder={t("fields.itemTitle", { defaultValue: "Item title..." })}
                    />
                    <textarea
                      value={item.content || ""}
                      onChange={(e) =>
                        handleContentChange(index, e.target.value)
                      }
                      className={`${baseInputClass} min-h-[60px] resize-none`}
                      placeholder={t("fields.itemContent", { defaultValue: "Item content..." })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:border-[var(--kyro-sidebar-active)] hover:text-[var(--kyro-text-primary)] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Item
      </button>
    </div>
  );
};

export default AccordionField;
