import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { HeadingSubheadingField } from "../fields/HeadingSubheadingField";
import { BlockWrapper } from "./BlockWrapper";

interface HeadingSubheadingBlockData {
  title?: string;
  subtitle?: string;
}

export const HeadingSubheadingBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
  const blockData = useBlockById(block.id);
  const { updateBlock } = useBlockActions();

  const data = (blockData?.data ?? block.data ?? {}) as HeadingSubheadingBlockData;

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <BlockWrapper id={block.id} type="heading-subheading" label="Heading + Subheading">
      <HeadingSubheadingField
        heading={data.title || ""}
        subheading={data.subtitle || ""}
        onChange={handleChange}
        compact
      />
    </BlockWrapper>
  );
};
