import { IconSearch, IconLoader2 } from "./icons";
import type { ReactNode, KeyboardEvent, FocusEvent, RefObject } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  rightElement?: ReactNode;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  loading,
  disabled,
  onKeyDown,
  onFocus,
  onBlur,
  inputRef,
  rightElement,
}: SearchInputProps) {
  return (
    <div className={`relative flex-1 group ${className}`}>
      {loading ? (
        <IconLoader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-secondary)] animate-spin opacity-40 group-focus-within:opacity-100 transition-opacity" />
      ) : (
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-secondary)] opacity-40 group-focus-within:opacity-100 transition-opacity" />
      )}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className="w-full pl-10 pr-4 py-2.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent disabled:opacity-50"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
