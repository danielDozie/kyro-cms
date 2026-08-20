import React, { useState, useCallback, useMemo, useEffect } from "react";
import type { JSONField as JSONFieldType } from "@kyro-cms/core/client";
import {
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconMail,
  IconFile,
  IconList,
  IconCode2,
} from "../ui/icons";

interface JSONFieldProps {
  field: JSONFieldType;
  value?: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

interface TreeNode {
  key: string;
  value: unknown;
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  path: string[];
  collapsed?: boolean;
}

// Convert camelCase, snake_case, kebab-case into human-readable Title Case
function formatFieldLabel(key: string): string {
  if (!key) return "";
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function isUrl(val: string): boolean {
  return /^https?:\/\//i.test(val.trim());
}

function isDateString(val: string): boolean {
  if (typeof val !== "string" || val.length < 8) return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export const JSONField: React.FC<JSONFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const isReadOnly = Boolean(
    disabled || (field as any).admin?.readOnly === true
  );

  // Normalize initial value to object or string
  const parsedObject = useMemo(() => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [value]);

  const [textValue, setTextValue] = useState<string>(() => {
    if (typeof value === "string") return value;
    return JSON.stringify(value || {}, null, 2);
  });

  const [parseError, setParseError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"fields" | "tree" | "json">(() => {
    // If it's a key-value object (like Form Entries submitted data), default to "fields" view
    return parsedObject !== null ? "fields" : "json";
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Synchronize incoming external value changes to textValue
  useEffect(() => {
    if (typeof value === "string") {
      setTextValue(value);
    } else if (value !== undefined) {
      setTextValue(JSON.stringify(value, null, 2));
    }
  }, [value]);

  const handleTextChange = useCallback(
    (text: string) => {
      setTextValue(text);
      try {
        const parsed = JSON.parse(text);
        setParseError(null);
        onChange?.(parsed);
      } catch (e) {
        if (text.trim()) {
          setParseError((e as Error).message);
        }
      }
    },
    [onChange]
  );

  const handleFieldChange = useCallback(
    (key: string, newVal: unknown) => {
      const current = parsedObject ? { ...parsedObject } : {};
      current[key] = newVal;
      setTextValue(JSON.stringify(current, null, 2));
      onChange?.(current);
    },
    [parsedObject, onChange]
  );

  const formatJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(textValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setTextValue(formatted);
      onChange?.(parsed);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  }, [textValue, onChange]);

  const minifyJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(textValue);
      const minified = JSON.stringify(parsed);
      setTextValue(minified);
      onChange?.(parsed);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  }, [textValue, onChange]);

  const copyToClipboard = useCallback((text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } else {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    }
  }, []);

  const treeData = useMemo(() => {
    try {
      const parsed = JSON.parse(textValue);
      return buildTree(parsed, []);
    } catch {
      return null;
    }
  }, [textValue]);

  if (!isMounted) {
    return (
      <div className="kyro-form-field">
        <label className="kyro-form-label">
          {(field.label || field.name) as string}
          {field.required && (
            <span className="kyro-form-label-required">*</span>
          )}
        </label>
        <div className="h-[200px] bg-[var(--kyro-surface)] animate-pulse rounded-lg border border-[var(--kyro-border)]" />
      </div>
    );
  }

  const entries = parsedObject ? Object.entries(parsedObject) : [];

  return (
    <div className="kyro-form-field">
      {/* Header & View Mode Switcher */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="kyro-form-label !mb-0">
            {(field.label || field.name) as string}
            {field.required && (
              <span className="kyro-form-label-required">*</span>
            )}
          </label>
          {parsedObject && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] border border-[var(--kyro-border)]">
              {entries.length} {entries.length === 1 ? "field" : "fields"}
            </span>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--kyro-border)] bg-[var(--kyro-bg-secondary)] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("fields")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === "fields"
                ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] shadow-sm"
                : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
              }`}
          >
            <IconList className="w-3.5 h-3.5" />
            Fields
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === "tree"
                ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] shadow-sm"
                : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
              }`}
          >
            <IconCode2 className="w-3.5 h-3.5" />
            Tree
          </button>
          <button
            type="button"
            onClick={() => setViewMode("json")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === "json"
                ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] shadow-sm"
                : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
              }`}
          >
            <IconFile className="w-3.5 h-3.5" />
            Raw JSON
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`border border-[var(--kyro-border)] rounded-lg overflow-hidden bg-[var(--kyro-surface)] shadow-xs ${disabled ? "opacity-60 cursor-not-allowed" : ""
          } ${error || parseError ? "border-[var(--kyro-error)]" : ""}`}
      >
        {/* Top Action Toolbar (when in JSON or Tree mode, or global copy) */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--kyro-border)] bg-[var(--kyro-bg-secondary)]/50 text-xs">
          <div className="flex items-center gap-2">
            {viewMode === "json" && (
              <>
                <button
                  type="button"
                  onClick={formatJSON}
                  disabled={isReadOnly}
                  className="px-2.5 py-1 text-xs font-medium bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] rounded-md border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface-accent)] transition-colors disabled:opacity-50"
                >
                  Format
                </button>
                <button
                  type="button"
                  onClick={minifyJSON}
                  disabled={isReadOnly}
                  className="px-2.5 py-1 text-xs font-medium bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] rounded-md border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface-accent)] transition-colors disabled:opacity-50"
                >
                  Minify
                </button>
              </>
            )}
            {viewMode === "fields" && (
              <span className="text-[11px] text-[var(--kyro-text-muted)] font-medium">
                Mapped field values for this entry
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(textValue)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] rounded-md border border-[var(--kyro-border)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
          >
            {copiedAll ? (
              <>
                <IconCheck className="w-3 h-3 text-[var(--kyro-success)]" />
                <span>Copied JSON</span>
              </>
            ) : (
              <>
                <IconCopy className="w-3 h-3" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* 1. Mapped Fields View */}
        {viewMode === "fields" && (
          <div className="p-4 space-y-3">
            {entries.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--kyro-text-muted)] italic">
                No submitted field data available.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {entries.map(([k, val]) => {
                  const label = formatFieldLabel(k);
                  const isCopied = copiedKey === k;
                  const valString =
                    typeof val === "object" && val !== null
                      ? JSON.stringify(val, null, 2)
                      : String(val ?? "");

                  const isMultiline =
                    typeof val === "string" && (val.length > 80 || val.includes("\n"));
                  const isValEmail = typeof val === "string" && isEmail(val);
                  const isValUrl = typeof val === "string" && isUrl(val);
                  const isValDate = typeof val === "string" && isDateString(val);

                  return (
                    <div
                      key={k}
                      className={`p-3.5 rounded-xl border border-[var(--kyro-border)] bg-[var(--kyro-bg-secondary)]/30 hover:border-[var(--kyro-border-focus)] transition-all ${isMultiline ? "md:col-span-2" : ""
                        }`}
                    >
                      {/* Label & Raw API Key */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--kyro-text-primary)]">
                            {label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-muted)] border border-[var(--kyro-border)]/50">
                            {k}
                          </span>
                        </div>

                        {/* Copy Field Button */}
                        <button
                          type="button"
                          onClick={() => copyToClipboard(valString, k)}
                          title={`Copy ${label}`}
                          className="p-1 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] rounded hover:bg-[var(--kyro-surface-accent)] transition-colors"
                        >
                          {isCopied ? (
                            <IconCheck className="w-3.5 h-3.5 text-[var(--kyro-success)]" />
                          ) : (
                            <IconCopy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Value Display / Editor */}
                      {isReadOnly ? (
                        <div className="text-sm font-medium text-[var(--kyro-text-primary)]">
                          {val === null || val === undefined || val === "" ? (
                            <span className="text-[var(--kyro-text-muted)] italic">—</span>
                          ) : typeof val === "boolean" ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${val
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                                  : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                                }`}
                            >
                              {val ? "Yes / True" : "No / False"}
                            </span>
                          ) : isValEmail ? (
                            <a
                              href={`mailto:${val}`}
                              className="inline-flex items-center gap-1.5 text-[var(--kyro-primary)] hover:underline"
                            >
                              <IconMail className="w-3.5 h-3.5 shrink-0" />
                              {val}
                            </a>
                          ) : isValUrl ? (
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[var(--kyro-primary)] hover:underline break-all"
                            >
                              <IconExternalLink className="w-3.5 h-3.5 shrink-0" />
                              {val}
                            </a>
                          ) : isValDate ? (
                            <span className="font-mono text-xs text-[var(--kyro-text-secondary)]">
                              {new Date(val).toLocaleString()}
                            </span>
                          ) : Array.isArray(val) ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {val.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 rounded-md bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] border border-[var(--kyro-border)]"
                                >
                                  {typeof item === "object" ? JSON.stringify(item) : String(item)}
                                </span>
                              ))}
                            </div>
                          ) : typeof val === "object" ? (
                            <pre className="p-2.5 rounded-lg bg-[var(--kyro-surface-accent)] text-xs font-mono overflow-auto max-h-40 text-[var(--kyro-text-secondary)]">
                              {JSON.stringify(val, null, 2)}
                            </pre>
                          ) : isMultiline ? (
                            <div className="p-2.5 rounded-lg bg-[var(--kyro-surface-accent)]/50 text-sm whitespace-pre-wrap leading-relaxed border border-[var(--kyro-border)]/50 text-[var(--kyro-text-primary)]">
                              {val}
                            </div>
                          ) : (
                            <span className="text-[var(--kyro-text-primary)] select-all">
                              {String(val)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          {typeof val === "boolean" ? (
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={(e) => handleFieldChange(k, e.target.checked)}
                              className="h-4 w-4 rounded border-[var(--kyro-border)] text-[var(--kyro-primary)]"
                            />
                          ) : isMultiline ? (
                            <textarea
                              value={String(val ?? "")}
                              onChange={(e) => handleFieldChange(k, e.target.value)}
                              rows={3}
                              className="w-full p-2.5 text-sm bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-lg text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)] resize-y"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(val ?? "")}
                              onChange={(e) => handleFieldChange(k, e.target.value)}
                              className="w-full p-2 text-sm bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-lg text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Tree View */}
        {viewMode === "tree" && (
          <div className="p-4 max-h-[420px] overflow-auto font-mono text-xs">
            {treeData ? (
              <TreeView data={treeData} />
            ) : (
              <p className="text-sm text-[var(--kyro-text-muted)] italic">
                Invalid JSON - switch to Raw JSON view to fix
              </p>
            )}
          </div>
        )}

        {/* 3. Raw JSON View */}
        {viewMode === "json" && (
          <div>
            <textarea
              value={textValue}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={isReadOnly}
              rows={9}
              className="w-full p-4 font-mono text-xs resize-y focus:outline-none bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] leading-relaxed"
              placeholder='{"key": "value"}'
            />
          </div>
        )}
      </div>

      {/* Description & Errors */}
      {!!field.admin?.description && !error && !parseError && (
        <p className="kyro-form-help mt-1.5">{(field as any).admin.description}</p>
      )}
      {(error || parseError) && (
        <p className="kyro-form-error mt-1.5">{error || parseError}</p>
      )}
    </div>
  );
};

// Tree view components
const TreeView: React.FC<{ data: TreeNode }> = ({ data }) => {
  const [collapsed, setCollapsed] = useState(false);

  const renderValue = (node: TreeNode) => {
    if (node.type === "object") {
      return (
        <div className="pl-4 border-l border-[var(--kyro-border)]">
          {Object.entries(node.value as object).map(([key, child]) => (
            <TreeNodeView
              key={key}
              name={key}
              value={child}
              path={[...node.path, key]}
            />
          ))}
        </div>
      );
    }
    if (node.type === "array") {
      return (
        <div className="pl-4 border-l border-[var(--kyro-border)]">
          {(node.value as any[]).map((item: unknown, index: number) => (
            <TreeNodeView
              key={index}
              name={String(index)}
              value={item}
              path={[...node.path, String(index)]}
            />
          ))}
        </div>
      );
    }
    return null;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "string":
        return "text-green-600 dark:text-green-400";
      case "number":
        return "text-blue-600 dark:text-blue-400";
      case "boolean":
        return "text-purple-600 dark:text-purple-400";
      case "null":
        return "text-gray-400";
      default:
        return "text-[var(--kyro-text-primary)]";
    }
  };

  const getValueDisplay = (item: TreeNode) => {
    if (item.type === "string") return `"${item.value}"`;
    if (item.type === "null") return "null";
    return String(item.value);
  };

  const getPreview = (item: TreeNode) => {
    if (item.type === "object") {
      const keys = Object.keys(item.value as object);
      return `{${keys.length} ${keys.length === 1 ? "key" : "keys"}}`;
    }
    if (item.type === "array") {
      return `[${(item.value as any[]).length} ${(item.value as any[]).length === 1 ? "item" : "items"}]`;
    }
    return null;
  };

  const isExpandable = data.type === "object" || data.type === "array";

  return (
    <div className="py-0.5">
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-[var(--kyro-surface-accent)] rounded px-1.5 py-0.5 -ml-1.5 transition-colors"
        onClick={() => isExpandable && setCollapsed(!collapsed)}
      >
        {isExpandable && (
          <span className="text-[var(--kyro-text-muted)] text-[10px]">
            {collapsed ? "▶" : "▼"}
          </span>
        )}
        <span className="font-semibold text-[var(--kyro-text-primary)]">
          {data.key}
        </span>
        <span className="text-[var(--kyro-text-muted)]">:</span>
        {isExpandable ? (
          <span className="text-xs text-[var(--kyro-text-muted)]">
            {collapsed ? getPreview(data) : data.type === "object" ? "{" : "["}
          </span>
        ) : (
          <span className={`font-mono text-xs ${getTypeColor(data.type)}`}>
            {getValueDisplay(data)}
          </span>
        )}
      </div>
      {!collapsed && isExpandable && renderValue(data)}
      {collapsed && isExpandable && (
        <span className="text-[var(--kyro-text-muted)] ml-6 text-xs">
          {data.type === "object" ? "}" : "]"}
        </span>
      )}
    </div>
  );
};

const TreeNodeView: React.FC<{ name: string; value: unknown; path: string[] }> = ({
  name,
  value,
  path,
}) => {
  const type = getType(value);
  const treeNode: TreeNode = { key: name, value, type, path };
  return <TreeView data={treeNode} />;
};

function getType(value: unknown): TreeNode["type"] {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as TreeNode["type"];
}

function buildTree(value: unknown, path: string[]): TreeNode {
  return {
    key: path[path.length - 1] || "root",
    value,
    type: getType(value),
    path,
  };
}

export default JSONField;
