import "../../lib/i18n";
import React, { useState, useMemo } from "react";
import { Modal } from "./Modal";
import * as LucideIcons from "lucide-react";
import * as HeroOutline from "@heroicons/react/24/outline";
import * as HeroSolid from "@heroicons/react/24/solid";
import { Search } from "./icons";
import { useTranslation } from "react-i18next";

interface IconItem {
  id: string; // value to save (e.g. "lucide:activity" or "hero:sparkles")
  label: string;
  library: "lucide" | "hero-outline" | "hero-solid";
  Component: React.ComponentType<any>;
}

// Pre-build icon catalog
const lucideCatalog: IconItem[] = Object.keys(LucideIcons)
  .filter((key) => /^[A-Z]/.test(key) && key !== "LucideProps" && key !== "Icon")
  .map((key) => {
    const kebab = key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return {
      id: `lucide:${kebab}`,
      label: key,
      library: "lucide",
      Component: (LucideIcons as any)[key],
    };
  });

const heroOutlineCatalog: IconItem[] = Object.keys(HeroOutline)
  .filter((key) => /Icon$/.test(key))
  .map((key) => {
    const rawName = key.replace(/Icon$/, "");
    const kebab = rawName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return {
      id: `hero:${kebab}`,
      label: rawName,
      library: "hero-outline",
      Component: (HeroOutline as any)[key],
    };
  });

const heroSolidCatalog: IconItem[] = Object.keys(HeroSolid)
  .filter((key) => /Icon$/.test(key))
  .map((key) => {
    const rawName = key.replace(/Icon$/, "");
    const kebab = rawName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return {
      id: `hero-solid:${kebab}`,
      label: rawName,
      library: "hero-solid",
      Component: (HeroSolid as any)[key],
    };
  });

const allCatalog: IconItem[] = [
  ...lucideCatalog,
  ...heroOutlineCatalog,
  ...heroSolidCatalog,
];

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

export function IconPickerModal({ open, onClose, onSelect }: IconPickerModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "lucide" | "hero-outline" | "hero-solid">("all");

  const filteredIcons = useMemo(() => {
    let list = allCatalog;
    if (tab === "lucide") list = lucideCatalog;
    if (tab === "hero-outline") list = heroOutlineCatalog;
    if (tab === "hero-solid") list = heroSolidCatalog;

    if (!search.trim()) return list;
    const lowerSearch = search.toLowerCase();
    return list.filter((item) => item.label.toLowerCase().includes(lowerSearch) || item.id.includes(lowerSearch));
  }, [search, tab]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("tooltips.selectAnIcon", { defaultValue: "Select an Icon" })}
      size="xl"
    >
      <div className="flex flex-col h-[65vh]">
        {/* Search & Tabs Header */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-muted)]" />
            <input
              type="text"
              placeholder={t("fields.searchIcons", { defaultValue: "Search icons..." })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] transition-all text-sm font-bold"
            />
          </div>

          <div className="flex items-center gap-1 bg-[var(--kyro-surface-accent)] p-1 rounded-xl border border-[var(--kyro-border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${tab === "all" ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] shadow-sm" : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"}`}
            >
              All ({allCatalog.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("lucide")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${tab === "lucide" ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] shadow-sm" : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"}`}
            >
              Lucide
            </button>
            <button
              type="button"
              onClick={() => setTab("hero-outline")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${tab === "hero-outline" ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] shadow-sm" : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"}`}
            >
              Heroicons
            </button>
            <button
              type="button"
              onClick={() => setTab("hero-solid")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${tab === "hero-solid" ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] shadow-sm" : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"}`}
            >
              Solid
            </button>
          </div>
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
          {filteredIcons.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--kyro-text-secondary)] font-medium">
              No icons found
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 pb-8">
              {filteredIcons.map((item) => {
                const IconComponent = item.Component;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-3 gap-2 rounded-xl border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface-accent)] hover:border-[var(--kyro-primary)] transition-all group"
                    title={`${item.label} (${item.id})`}
                  >
                    <IconComponent
                      className="w-6 h-6 text-[var(--kyro-text-secondary)] group-hover:text-[var(--kyro-primary)] transition-colors"
                      strokeWidth={1.5}
                    />
                    <span className="text-[10px] text-[var(--kyro-text-secondary)] truncate w-full text-center group-hover:text-[var(--kyro-text-primary)]">
                      {item.label}
                    </span>
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
