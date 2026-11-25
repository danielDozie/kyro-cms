import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { ChevronDown, Check } from "../ui/icons";
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
      <div className="field-select-control"><Dropdown matchTriggerWidth align="left" direction="down" menuClassName="max-h-72 overflow-y-auto"
        trigger={<button type="button" id={field.name} disabled={disabled || isReadOnly}
          className="kyro-form-input flex items-center justify-between gap-2 text-left"
          aria-label={field.label || field.name}>
          <span>{options.filter(option => Array.isArray(value) ? value.includes(option.value) : option.value === value).map(option => option.label).join(", ") || "Select…"}</span>
          <ChevronDown size={13} aria-hidden="true" />
        </button>}>
        {!field.required && !field.hasMany && <DropdownItem onClick={() => onChange?.(undefined)}>Clear selection</DropdownItem>}
        {options.map(option => {
          const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;
          return <DropdownItem key={option.value} disabled={disabled || isReadOnly} onClick={() => {
            if (field.hasMany) {
              const current = Array.isArray(value) ? value : [];
              onChange?.(selected ? current.filter(item => item !== option.value) : [...current, option.value]);
            } else onChange?.(option.value);
          }} icon={selected ? <Check size={13} /> : undefined}>{option.label}</DropdownItem>;
        })}
        {options.length === 0 && <p className="p-3 text-xs text-[var(--kyro-text-secondary)]">No options available</p>}
      </Dropdown></div>
    </FieldLayout>
  );
}
