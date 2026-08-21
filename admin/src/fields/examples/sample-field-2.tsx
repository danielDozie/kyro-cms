import "../../lib/i18n";
import React from "react";
import type { FieldEditorProps } from "../types.ts";
import { registerField } from "../registry.tsx";
import type { KyroField } from "../types.ts";
import { useTranslation } from "react-i18next";

const SampleTextareaEditor: React.FC<FieldEditorProps> = ({
  name,
  value,
  onChange,
}) => {
    const { t } = useTranslation();
  return (
    <textarea
      name={name}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={t("fields.sampleTextarea", { defaultValue: "Sample textarea" })}
    />
  );
};

const field: KyroField = {
  id: "sample-textarea",
  type: "textarea",
  label: "Sample Textarea",
  editor: SampleTextareaEditor,
};

registerField(field);
export default field;
export { field as sampleField2 };
