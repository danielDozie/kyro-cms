import "../../lib/i18n";
import React from "react";
import { Plus, GripVertical } from "../ui/icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";

interface ListFieldProps {
  items?: string[];
  onChange: (items: string[]) => void;
  compact?: boolean;
}

interface SortableListItemProps {
  id: string;
  text: string;
  onRemove: () => void;
}

function SortableListItem({ id, text, onRemove }: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 group/item p-1.5 hover:bg-[var(--kyro-surface-accent)]/50 rounded-md transition-colors ${
        isDragging ? "bg-[var(--kyro-surface-accent)] shadow-sm" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] hover:bg-[var(--kyro-border)] rounded flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm text-[var(--kyro-text-primary)] flex-1">
        • {text}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-[var(--kyro-danger-bg)] rounded text-[var(--kyro-error)] transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

export const ListField: React.FC<ListFieldProps> = ({
  items = [],
  onChange,
  compact = false,
}) => {
    const { t } = useTranslation();
  const [inputValue, setInputValue] = React.useState("");
  const [mappedItems, setMappedItems] = React.useState<{ id: string; text: string }[]>([]);

  // Synchronize incoming items
  React.useEffect(() => {
    const mappedTexts = mappedItems.map(item => item.text);
    if (JSON.stringify(mappedTexts) !== JSON.stringify(items)) {
      setMappedItems(
        items.map((text, idx) => ({
          id: `${text}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          text,
        }))
      );
    }
  }, [items]);

  const handleAdd = () => {
    if (inputValue.trim()) {
      onChange([...items, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = mappedItems.findIndex((item) => item.id === active.id);
    const newIndex = mappedItems.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = [...items];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);
      onChange(newItems);
    }
  };

  const inputClass = compact
    ? "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded-md bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        {items.length === 0 ? (
          <div className="text-center py-4 text-[var(--kyro-text-muted)] text-sm border border-dashed border-[var(--kyro-border)] rounded-md">
            No items. Type below to add.
          </div>
        ) : (
          <SortableContext
            items={mappedItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {mappedItems.map((item, index) => (
                <SortableListItem
                  key={item.id}
                  id={item.id}
                  text={item.text}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </div>
          </SortableContext>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={inputClass}
          placeholder={t("fields.typeAndPressEnter", { defaultValue: "Type and press Enter to add..." })}
        />
      </div>
    </DndContext>
  );
};

export default ListField;
