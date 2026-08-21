import "../../lib/i18n";
import React, { useState, useMemo } from "react";
import { Modal } from "./Modal";
import * as LucideIcons from "lucide-react";
import { Search } from "./icons";
import { useTranslation } from "react-i18next";

// Extract only valid components from lucide-react
const availableIcons = Object.keys(LucideIcons).filter((key) => {
  return /^[A-Z]/.test(key) && key !== "LucideProps" && key !== "Icon";
});

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

export function IconPickerModal({ open, onClose, onSelect }: IconPickerModalProps) {
    const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search) return availableIcons;
    const lowerSearch = search.toLowerCase();
    return availableIcons.filter((iconName) => iconName.toLowerCase().includes(lowerSearch));
  }, [search]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("tooltips.selectAnIcon", { defaultValue: "Select an Icon" })}
      size="xl"
    >
      <div className="flex flex-col h-[60vh]">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-muted)]" />
          <input
            type="text"
            placeholder={t("fields.searchIcons", { defaultValue: "Search icons..." })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] transition-all text-sm font-bold"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
          {filteredIcons.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--kyro-text-secondary)] font-medium">
              No icons found
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 pb-8">
              {filteredIcons.map((iconName) => {
                const IconComponent = (LucideIcons as any)[iconName];
                // we store standard kebab-case in db
                const kebabName = iconName
                  .replace(/([a-z])([A-Z])/g, "$1-$2")
                  .toLowerCase();

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onSelect(kebabName);
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-3 gap-2 rounded-md border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface-accent)] hover:border-[var(--kyro-primary)] transition-all group"
                    title={iconName}
                  >
                    <IconComponent className="w-6 h-6 text-[var(--kyro-text-secondary)] group-hover:text-[var(--kyro-primary)] transition-colors" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
