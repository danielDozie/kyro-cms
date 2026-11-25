import { useEffect, useId, useState, type FormEvent } from "react";
import { Modal } from "./Modal";

interface PromptModalProps {
  open: boolean; onClose: () => void; onSubmit: (value: string) => void;
  title: string; placeholder?: string; defaultValue?: string;
}
export function PromptModal({ open, onClose, onSubmit, title, placeholder = "", defaultValue = "" }: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputId = useId();
  useEffect(() => { if (open) setValue(defaultValue); }, [open, defaultValue]);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    onClose();
  };
  return <Modal open={open} onClose={onClose} title={title} size="md" compact>
    <form onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="block text-sm mb-2">{placeholder || "Name"}</label>
      <input id={inputId} data-autofocus type="text" value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder} className="kyro-form-input w-full" required />
      <div className="flex items-center justify-end gap-3 mt-6">
        <button type="button" className="kyro-btn kyro-btn-md kyro-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="kyro-btn kyro-btn-md kyro-btn-primary" disabled={!value.trim()}>Confirm</button>
      </div>
    </form>
  </Modal>;
}
