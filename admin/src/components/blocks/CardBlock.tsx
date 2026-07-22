import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { CardField } from "../fields/CardField";
import { BlockWrapper } from "./BlockWrapper";

interface CardBlockData {
  title?: string;
  description?: string;
  icon?: string;
  link?: string;
  linkText?: string;
}

export const CardBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
  const blockData = useBlockById(block.id);
  const { updateBlock } = useBlockActions();

  const data = (blockData?.data ?? block.data ?? {}) as CardBlockData;

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <BlockWrapper id={block.id} type="card" label="Card">
      <CardField
        title={data.title || ""}
        description={data.description || ""}
        icon={data.icon || ""}
        link={data.link || ""}
        linkText={data.linkText || ""}
        onChange={handleChange}
        compact
      />
    </BlockWrapper>
  );
};
