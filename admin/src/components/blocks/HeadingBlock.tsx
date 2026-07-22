import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { HeadingField } from "../fields/HeadingField";
import { BlockWrapper } from "./BlockWrapper";

interface HeadingBlockData {
  text?: string;
}

export const HeadingBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
  const blockData = useBlockById(block.id);
  const { updateBlock } = useBlockActions();

  const data = (blockData?.data ?? block.data ?? {}) as HeadingBlockData;

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <BlockWrapper id={block.id} type="heading" label="Heading">
      <HeadingField text={data.text || ""} onChange={handleChange} compact />
    </BlockWrapper>
  );
};
