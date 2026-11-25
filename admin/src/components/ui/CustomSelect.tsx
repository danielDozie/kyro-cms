import React, { useLayoutEffect, useRef, useState } from "react";
import { Dropdown, DropdownItem } from "./Dropdown";
import { ChevronDown, Check } from "./icons";

export function CustomSelect({ children, className, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [options, setOptions] = useState<{ value: string; label: string; disabled: boolean; selected: boolean }[]>([]);
  useLayoutEffect(() => {
    const next = Array.from(selectRef.current?.options || []).map(option => ({
      value: option.value, label: option.label, disabled: option.disabled, selected: option.selected,
    }));
    setOptions(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
  });
  return <div className="custom-select-control">
    <select {...props} id={undefined} ref={selectRef} tabIndex={-1} aria-hidden="true"
      className="custom-select-native"
      onInvalid={event => { event.preventDefault(); buttonRef.current?.focus(); }} >
      {children}
    </select>
    <Dropdown matchTriggerWidth align="left" direction="down"
      trigger={<button ref={buttonRef} type="button" id={props.id}
        disabled={props.disabled} className={className || "kyro-form-input"} style={style}
        aria-label={props["aria-label"] || props.name || "Select option"}>
        <span>{options.filter(option => option.selected).map(option => option.label).join(", ") || "Select…"}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>}>
      {options.map((option, index) => <DropdownItem key={option.value + index} disabled={option.disabled}
        icon={option.selected ? <Check size={13} /> : undefined} onClick={() => {
          const select = selectRef.current;
          if (!select) return;
          if (props.multiple) select.options[index].selected = !option.selected;
          else select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          setOptions(Array.from(select.options).map(item => ({ value: item.value, label: item.label, disabled: item.disabled, selected: item.selected })));
        }}>{option.label}</DropdownItem>)}
    </Dropdown>
  </div>;
}
