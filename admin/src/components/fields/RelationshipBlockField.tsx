import "../../lib/i18n";
import React, { useState, useEffect } from "react";
import { Search, Loader2, X } from "../ui/icons";
import { apiGet, buildSearchQuery } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";
import { useTranslation } from "react-i18next";

interface RelationshipBlockFieldProps {
  relationTo?: string;
  hasMany?: boolean;
  selectedIds?: string[];
  selectedId?: string;
  labelField?: string;
  onChange: (field: string, value: unknown) => void;
  compact?: boolean;
}

export const RelationshipBlockField: React.FC<RelationshipBlockFieldProps> = ({
  relationTo = "pages",
  hasMany = false,
  selectedIds = [],
  selectedId,
  labelField = "title",
  onChange,
  compact = false,
}) => {
    const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);

  useEffect(() => {
    apiGet("/api/collections")
      .then((data) => {
        setCollections(
          (data.collections || []).map((c: any) => c.slug || c.name || c),
        );
        setLoadingCollections(false);
      })
      .catch(() => setLoadingCollections(false));
  }, []);

  const fetchOptions = (query: string = "") => {
    setLoading(true);
    const url = `/api/${relationTo}?${buildSearchQuery(query, [labelField], 20)}`;

    apiGet(url)
      .then((data) => {
        setOptions(data.docs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) fetchOptions(search);
  }, [isOpen, search, relationTo, labelField]);

  const getLabel = (opt: any) => {
    return (
      opt?.[labelField] ||
      opt?.title ||
      opt?.name ||
      opt?.label ||
      opt?.filename ||
      opt?.slug ||
      opt?.id ||
      "Untitled"
    );
  };

  const activeIds = hasMany ? selectedIds : selectedId ? [selectedId] : [];

  const handleSelect = (opt: any) => {
    if (hasMany) {
      if (activeIds.includes(opt.id)) {
        onChange(
          "selectedIds",
          activeIds.filter((id: string) => id !== opt.id),
        );
      } else {
        onChange("selectedIds", [...activeIds, opt.id]);
      }
    } else {
      onChange("selectedId", opt.id);
      onChange("selectedIds", [opt.id]);
      setIsOpen(false);
    }
  };

  const isSelected = (optId: string) => activeIds.includes(optId);

  const inputClass = compact
    ? "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  const selectClass = compact
    ? "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  // Check if relationTo is a known single collection (not an array)
  const isKnownCollection = relationTo && typeof relationTo === "string" && relationTo.length > 0;

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className={compact ? "flex items-center gap-2" : "space-y-3"}>
        {/* Hide collection selector if relationTo is known (single collection) */}
        {!isKnownCollection && (
          <>
            {loadingCollections ? (
              <div className={selectClass + " text-[var(--kyro-text-muted)]"}>
                Loading...
              </div>
            ) : (
              <select
                value={relationTo}
                onChange={(e) => onChange("relationTo", e.target.value)}
                className={selectClass}
              >
                <option value="">Select collection...</option>
                {collections.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {!compact && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasMany}
              onChange={(e) => onChange("hasMany", e.target.checked)}
              className="w-4 h-4 rounded border-[var(--kyro-border)] focus:ring-[var(--kyro-sidebar-active)] focus:ring-offset-0"
            />
            <span className="text-sm text-[var(--kyro-text-primary)]">
              Allow multiple
            </span>
          </label>
        )}
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder={`Search ${relationTo}...`}
            className={`${inputClass} pl-9`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading && (
              <Loader2 className="w-4 h-4 text-[var(--kyro-text-muted)] animate-spin" />
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-20 w-full mt-1 border border-[var(--kyro-border)] rounded-lg shadow-lg bg-[var(--kyro-surface)] max-h-48 overflow-auto">
            {loading ? (
              <div className="p-3 text-center text-sm text-[var(--kyro-text-muted)]">
                Loading...
              </div>
            ) : options.length === 0 ? (
              <EmptyState title={t("tooltips.noResultsFound", { defaultValue: "No results found" })} />
            ) : (
              <div className="py-1">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--kyro-surface-accent)] transition-colors flex items-center justify-between ${
                      isSelected(opt.id)
                        ? "bg-[var(--kyro-sidebar-active)]/10 text-[var(--kyro-sidebar-active)]"
                        : "text-[var(--kyro-text-primary)]"
                    }`}
                  >
                    <span>{getLabel(opt)}</span>
                    {isSelected(opt.id) && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeIds.map((id: string) => {
            const opt = options.find((o) => o.id === id) || { id };
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-[var(--kyro-sidebar-active)]/10 text-[var(--kyro-sidebar-active)]"
              >
                {getLabel(opt)}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (hasMany) {
                      onChange(
                        "selectedIds",
                        activeIds.filter((sid: string) => sid !== id),
                      );
                    } else {
                      onChange("selectedId", null);
                      onChange("selectedIds", []);
                    }
                  }}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RelationshipBlockField;
