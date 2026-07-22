import React from "react";
import { BlockWrapper } from "./BlockWrapper";
import { FieldRenderer } from "../FieldRenderer";
import { useBlockById, useBlockActions } from "../fields/extensions/blocksStore";

interface GenericBlockProps {
  block: { id: string; data?: Record<string, unknown>; type?: string };
  index: number;
  blockSchema: Record<string, any>;
}

export const GenericBlock: React.FC<GenericBlockProps> = ({
  block,
  index,
  blockSchema,
}) => {
  const blockData = useBlockById(block.id);
  const { updateBlock } = useBlockActions();

  const data = (blockData?.data || block.data || {}) as Record<string, unknown>;

  const handleChange = (fieldName: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [fieldName]: value } });
  };

  return (
    <BlockWrapper id={block.id} type={block.type as string} label={blockSchema.label as string}>
      <div className="space-y-4 pt-2">
        {blockSchema.fields?.map((field: any) => {
          const value = data[field.name];
          return (
            <div key={field.name} className="kyro-block-field-row border-b border-[var(--kyro-border)]/30 pb-3 last:border-b-0 last:pb-0">
              <FieldRenderer
                field={field}
                value={value}
                onChange={(val) => handleChange(field.name, val)}
              />
            </div>
          );
        })}
      </div>
    </BlockWrapper>
  );
};
