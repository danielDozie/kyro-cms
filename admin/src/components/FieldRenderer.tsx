import React, { lazy, Suspense } from "react";
import type {
  Field,
  TextField as TextFieldType,
  NumberField as NumberFieldType,
  CheckboxField as CheckboxFieldType,
  SelectField as SelectFieldType,
  DateField as DateFieldType,
  CodeField as CodeFieldType,
  JSONField as JSONFieldType,
  UploadField as UploadFieldType,
  RelationshipField as RelationshipFieldType,
  BlocksField as BlocksFieldType,
  MarkdownField as MarkdownFieldType,
} from "@kyro-cms/core/client";
import { UploadField } from "./fields/UploadField";
import { CodeField, JSONField } from "./fields";
import NumberField from "./fields/NumberField";
import CheckboxField from "./fields/CheckboxField";
import SelectField from "./fields/SelectField";
import DateField from "./fields/DateField";
import { MarkdownField } from "./fields/MarkdownField";
import TextField from "./fields/TextField";
import IconField from "./fields/IconField";
import { BlocksField } from "./fields/BlocksField";
import { ListField } from "./fields/ListField";
import RelationshipField from "./fields/RelationshipField";
import SecretField from "./fields/SecretField";
import FieldLayout from "./fields/FieldLayout";
import { GroupLayout } from "./fields/GroupLayout";
import { ArrayLayout } from "./fields/ArrayLayout";
import { setChangeSource } from "../lib/change-source";

const LazyRichTextField = lazy(() => import("./fields/RichTextField"));

interface FieldRendererProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  formData?: Record<string, unknown>;
  siblingData?: Record<string, unknown>;
  collectionSlug?: string;
  globalSlug?: string;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
  formData,
  siblingData,
  collectionSlug,
  globalSlug,
}) => {
  if (field.hidden === true || field.admin?.hidden === true) return null;

  const onChangeKeystroke = (val: unknown) => {
    setChangeSource("keystroke");
    onChange(val);
  };

  switch (field.type) {
    case "text":
    case "email":
    case "url":
      return (
        <TextField
          field={field as TextFieldType}
          value={(value as string) ?? undefined}
          onChange={onChangeKeystroke as (value: string) => void}
          error={error}
          disabled={disabled}
        />
      );
    case "icon":
      return (
        <IconField
          field={field as any}
          value={(value as string) ?? undefined}
          onChange={onChangeKeystroke as (value: string) => void}
          error={error}
          disabled={disabled}
        />
      );
    case "textarea":
      return (
        <TextField
          field={{ ...field, variant: "textarea" } as TextFieldType}
          value={(value as string) ?? undefined}
          onChange={onChangeKeystroke as (value: string) => void}
          error={error}
          disabled={disabled}
        />
      );
    case "password":
      return (
        <TextField
          field={{ ...field, variant: "password" } as TextFieldType}
          value={(value as string) ?? undefined}
          onChange={onChangeKeystroke as (value: string) => void}
          error={error}
          disabled={disabled}
        />
      );
    case "secret":
      return (
        <SecretField
          field={field as any}
          value={(value as string) ?? undefined}
          onChange={onChange as (value: string) => void}
          error={error}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <NumberField
          field={field as NumberFieldType}
          value={(value as number) ?? undefined}
          onChange={onChange as (value: number | undefined) => void}
          disabled={disabled}
          error={error}
        />
      );
    case "checkbox":
      return (
        <CheckboxField
          field={field as CheckboxFieldType}
          value={value as boolean}
          onChange={onChange as (value: boolean) => void}
          disabled={disabled}
          error={error}
        />
      );
    case "radio":
    case "select":
      return (
        <SelectField
          field={field as SelectFieldType}
          value={(value as string | string[]) ?? undefined}
          onChange={onChangeKeystroke as (value: string | string[] | undefined) => void}
          error={error}
          disabled={disabled}
          formData={formData}
          siblingData={siblingData}
          collectionSlug={collectionSlug}
          globalSlug={globalSlug}
        />
      );
    case "date":
      return (
        <DateField
          field={field as DateFieldType}
          value={(value as string) ?? undefined}
          onChange={onChange as (value: string | undefined) => void}
          disabled={disabled}
          error={error}
        />
      );
    case "richtext":
      return (
        <Suspense fallback={<div className="h-24 surface-tile animate-pulse rounded-lg" />}>
          <LazyRichTextField
            field={field}
            value={value as Record<string, any> | null}
            onChange={onChangeKeystroke}
            disabled={disabled}
            error={error}
          />
        </Suspense>
      );
    case "markdown":
      return (
        <MarkdownField
          field={field as MarkdownFieldType}
          value={(value as string) ?? undefined}
          onChange={onChangeKeystroke as (value: string) => void}
          disabled={disabled}
          error={error}
        />
      );
    case "code":
      return (
        <CodeField
          field={field as CodeFieldType}
          value={(value as string) ?? undefined}
          onChange={onChangeKeystroke as (value: string) => void}
          disabled={disabled}
          error={error}
        />
      );
    case "json":
      return (
        <JSONField
          field={field as JSONFieldType}
          value={value}
          onChange={onChangeKeystroke}
          disabled={disabled || field.admin?.readOnly === true}
          error={error}
        />
      );
    case "image":
    case "upload":
      return (
        <FieldLayout field={field} error={error}>
          <UploadField
            field={field as UploadFieldType}
            value={value as Record<string, unknown> | Record<string, unknown>[] | null}
            onChange={onChange as (value: Record<string, unknown> | Record<string, unknown>[] | null) => void}
            disabled={disabled}
          />
        </FieldLayout>
      );
    case "relationship":
      return (
        <RelationshipField
          field={field as unknown as { name: string; label?: string; relationTo: string | string[]; hasMany?: boolean; required?: boolean; admin?: { description?: string; readOnly?: boolean; placeholder?: string; } }}
          value={value}
          onChange={onChange}
          disabled={disabled}
          error={error}
        />
      );
    case "list":
      return (
        <FieldLayout field={field} error={error}>
          <ListField
            items={Array.isArray(value) ? (value as string[]) : []}
            onChange={onChange as (items: string[]) => void}
            compact
          />
        </FieldLayout>
      );
    case "array":
      return (
        <ArrayLayout
          field={field}
          value={Array.isArray(value) ? (value as unknown[]) : []}
          onChange={onChange as (value: unknown[]) => void}
          disabled={disabled}
          renderField={(nestedField, parentData, onNestedChange) => {
            const nestedValue = parentData[nestedField.name];
            return (
              <FieldRenderer
                key={nestedField.name}
                field={nestedField}
                value={nestedValue}
                onChange={(val) => {
                  onNestedChange({
                    ...parentData,
                    [nestedField.name]: val,
                  });
                }}
                disabled={disabled}
                error={error}
              />
            );
          }}
        />
      );
    case "blocks":
      return (
        <BlocksField
          field={field as BlocksFieldType}
          value={value as unknown[]}
          onChange={onChangeKeystroke}
          disabled={disabled}
          error={error}
        />
      );
    case "group":
      return (
        <GroupLayout
          field={field}
          value={value as Record<string, unknown> | null}
          onChange={onChange as (value: Record<string, unknown>) => void}
          renderField={(nestedField, parentData, onNestedChange) => {
            const nestedValue = parentData[nestedField.name];
            return (
              <FieldRenderer
                key={nestedField.name}
                field={nestedField}
                value={nestedValue}
                onChange={(val) => {
                  onNestedChange({
                    ...parentData,
                    [nestedField.name]: val,
                  });
                }}
                disabled={disabled}
                error={error}
                collectionSlug={collectionSlug}
                globalSlug={globalSlug}
              />
            );
          }}
        />
      );
    case "color":
      return (
        <FieldLayout field={field} error={error}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={(value as string) || "#000000"}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="h-10 w-14 p-1 cursor-pointer bg-[var(--kyro-input-bg)] border border-[var(--kyro-input-border)] rounded-lg"
            />
            <input
              type="text"
              className="kyro-form-input font-mono "
              value={(value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder="#000000"
            />
          </div>
        </FieldLayout>
      );
    case "row":
      return (
        <div className="kyro-form-row flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end w-full">
          {((field as any).fields || []).map((f: Field) => (
            <div
              key={f.name}
              className="flex-1 w-full"
              style={f.admin?.width ? { width: f.admin.width as string, flex: "none" } : {}}
            >
              <FieldRenderer
                field={f}
                value={formData ? formData[f.name] : undefined}
                onChange={(val) => {
                  if (formData) {
                    onChange({ ...formData, [f.name]: val });
                  } else {
                    onChange(val);
                  }
                }}
                disabled={disabled}
                error={error}
                formData={formData}
                siblingData={siblingData}
                collectionSlug={collectionSlug}
                globalSlug={globalSlug}
              />
            </div>
          ))}
        </div>
      );
    case "collapsible":
      return (
        <details className="kyro-collapsible rounded-lg border border-[var(--kyro-border)] p-4 space-y-4">
          <summary className="cursor-pointer font-medium text-sm text-[var(--kyro-text-primary)] select-none">
            {field.label || field.name || "Details"}
          </summary>
          <div className="pt-3 space-y-4">
            {((field as any).fields || []).map((f: Field) => (
              <FieldRenderer
                key={f.name}
                field={f}
                value={formData ? formData[f.name] : undefined}
                onChange={(val) => {
                  if (formData) {
                    onChange({ ...formData, [f.name]: val });
                  } else {
                    onChange(val);
                  }
                }}
                disabled={disabled}
                error={error}
                formData={formData}
                siblingData={siblingData}
                collectionSlug={collectionSlug}
                globalSlug={globalSlug}
              />
            ))}
          </div>
        </details>
      );
    default:
      return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs italic">
          Field type "{field.type}" is not yet supported in this renderer.
        </div>
      );
  }
};
