import React, { useState, useId } from "react";
import type { Field } from "@kyro-cms/core/client";
import { ChevronDown } from "../ui/icons";

interface GroupLayoutProps {
  field: Field;
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown>) => void;
  renderField: (
    field: Field,
    parentData: Record<string, unknown>,
    onChange: (value: Record<string, unknown>) => void,
  ) => React.ReactNode;
}

export function GroupLayout({
  field,
  value,
  onChange,
  renderField,
}: GroupLayoutProps) {
  const groupData = value || {};
  const isCollapsible = field.admin?.collapsible !== false;
  const initialOpen = field.admin?.initCollapsed ? false : !isCollapsible;
  const [isOpen, setIsOpen] = useState(initialOpen);

  const subFields = (field as Field & { fields?: Field[] }).fields || [];

  const panelId = useId();
  const heading = <><span className="field-group-title">{field.label || field.name}</span><span className="field-group-count">{subFields.length} {subFields.length === 1 ? "field" : "fields"}</span>{isCollapsible && <ChevronDown className={`w-4 h-4 ml-auto text-[var(--kyro-text-muted)] ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />}</>;
  return <section className="field-group">
    {isCollapsible ? <button type="button" className="field-group-heading" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen(prev => !prev)}>{heading}</button> : <div className="field-group-heading">{heading}</div>}
    <div id={panelId} hidden={!isOpen}>{isOpen && <div className={`field-group-body ${field.admin?.inline ? "flex items-start gap-4 flex-wrap" : "field-stack"}`}>{subFields.map(f => renderField(f, groupData, onChange))}</div>}</div>
  </section>;
}
