import React from "react";
import type { FieldEditorProps } from "../types.ts";
import { registerField } from "../registry.tsx";
import type { KyroField } from "../types.ts";
import { useTranslation } from "react-i18next";

const SampleTextEditor: React.FC<FieldEditorProps> = ({
  name,
  value,
  onChange,
}) => {
    const { t } = useTranslation();
  return (
    <input
      name={name}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={t("fields.sampleText", { defaultValue: "Sample text" })}
    />
  );
};

const field: KyroField = {
  id: "sample-text",
  type: "text",
  label: "Sample Text",
  editor: SampleTextEditor,
};

registerField(field);
export default field;
export { field as sampleField };
