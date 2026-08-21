import "../../lib/i18n";
import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { BlockWrapper } from "./BlockWrapper";
import { useTranslation } from "react-i18next";

export const ParagraphBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock } = useBlockActions();

  const data = (blockData?.data || block.data || {}) as { text?: string };

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <BlockWrapper id={block.id} type="paragraph" label="Paragraph">
      <textarea
        value={data.text || ""}
        onChange={(e) => handleChange("text", e.target.value)}
        className="w-full px-3 py-3 border border-[var(--kyro-border)] rounded bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] text-sm min-h-[100px] resize-none"
        placeholder={t("fields.enterParagraphText", { defaultValue: "Enter paragraph text..." })}
      />
    </BlockWrapper>
  );
};
