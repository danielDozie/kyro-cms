import React, { useState, useEffect } from "react";
import type { SelectField as SelectFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";
import { collections } from "../../lib/config";
import { fetchWithAuth } from "../../lib/api";
import { apiPath } from "../../lib/paths";

interface SelectFieldComponentProps {
  field: SelectFieldType;
  value?: string | string[];
  onChange?: (value: string | string[] | undefined) => void;
  error?: string;
  disabled?: boolean;
  formData?: Record<string, unknown>;
  siblingData?: Record<string, unknown>;
  collectionSlug?: string;
  globalSlug?: string;
}

export default function SelectField({
  field,
  value,
  onChange,
  error,
  disabled,
  formData,
  siblingData,
  collectionSlug,
  globalSlug,
}: SelectFieldComponentProps) {
  const isReadOnly =
    typeof field.admin?.readOnly === "function"
      ? false
      : Boolean(field.admin?.readOnly);

  const [dynamicOptions, setDynamicOptions] = useState<Array<{ label: string; value: string }> | null>(null);

  // Debounce stringify for formData to prevent infinite loops or excessive refetches
  const formDataStr = JSON.stringify(formData || {});
  const siblingDataStr = JSON.stringify(siblingData || {});

  useEffect(() => {
    if ((field.options as any) !== "__KYRO_DYNAMIC_OPTIONS__") return;
    
    const fetchOptions = async () => {
      try {
        let url = "";
        if (collectionSlug) {
          url = `${apiPath}/${collectionSlug}/dynamic-options/${field.name}`;
        } else if (globalSlug) {
          url = `${apiPath}/globals/${globalSlug}/dynamic-options/${field.name}`;
        } else {
          return;
        }

        const res = await fetchWithAuth(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            data: JSON.parse(formDataStr), 
            siblingData: JSON.parse(siblingDataStr) 
          }),
        });
        
        if (res.ok) {
          const json = await res.json();
          if (json.options) {
            setDynamicOptions(json.options);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dynamic options:", err);
      }
    };

    const timer = setTimeout(fetchOptions, 300);
    return () => clearTimeout(timer);
  }, [formDataStr, siblingDataStr, field.name, field.options, collectionSlug, globalSlug]);

  // Resolve dynamic options at runtime if configured
  let options: Array<{ label: string; value: string }> = dynamicOptions || [];
  
  if ((field.options as any) !== "__KYRO_DYNAMIC_OPTIONS__") {
    if (typeof field.options === "function") {
      options = (field.options as any)({ data: formData || {}, siblingData: siblingData || {} });
    } else if (Array.isArray(field.options)) {
      options = field.options as any;
    }
  }

  if (field.dynamicOptions === "collections") {
    options = Object.keys(collections)
      .filter((slug) => slug !== "media")
      .map((slug) => ({
        label: collections[slug]?.label || slug,
        value: slug,
      }));
  }

  return (
    <FieldLayout
      field={field}
      error={error}
    >
      <select
        id={field.name}
        value={
          field.hasMany
            ? (Array.isArray(value) ? value : [])
            : value || ""
        }
        onChange={(e) => {
          if (field.hasMany) {
            const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
            onChange?.(selected);
          } else {
            onChange?.(e.target.value || undefined);
          }
        }}
        multiple={field.hasMany}
        disabled={disabled || isReadOnly}
        required={field.required}
        style={{
          color: field.hasMany 
            ? undefined 
            : (options as any[]).find(opt => opt.value === value)?.color || undefined,
        }}
        className={`kyro-form-input ${
          disabled || isReadOnly ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {!field.required && !field.hasMany && <option value="">Select...</option>}
        {options.map((option: any) => (
          <option key={option.value} value={option.value} style={{ color: option.color || undefined, fontWeight: option.color ? "bold" : "normal" }}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldLayout>
  );
}
