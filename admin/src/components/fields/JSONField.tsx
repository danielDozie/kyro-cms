import React, { useState, useCallback, useMemo, useEffect } from "react";
import type { JSONField as JSONFieldType } from "@kyro-cms/core/client";

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

export const JSONField: React.FC<JSONFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const [textValue, setTextValue] = useState<string>(() => {
    if (typeof value === "string") return value;
    return JSON.stringify(value || {}, null, 2);
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"text" | "tree">("text");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    [onChange],
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
        <div className="h-[200px] bg-[var(--kyro-surface)] animate-pulse rounded-md border border-[var(--kyro-border)]" />
      </div>
    );
  }

  return (
    <div className="kyro-form-field">
      <div className="flex items-center justify-between mb-2">
        <label className="kyro-form-label">
          {(field.label || field.name) as string}
          {field.required && (
            <span className="kyro-form-label-required">*</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-md overflow-hidden border border-[var(--kyro-border)]">
            <button
              type="button"
              onClick={() => setViewMode("text")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "text"
                  ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
                  : "bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "tree"
                  ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
                  : "bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
              }`}
            >
              Tree
            </button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={formatJSON}
          className="px-3 py-1.5 text-xs font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] rounded-md hover:bg-[var(--kyro-surface)] hover:text-[var(--kyro-text-primary)] transition-colors"
        >
          Format
        </button>
        <button
          type="button"
          onClick={minifyJSON}
          className="px-3 py-1.5 text-xs font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] rounded-md hover:bg-[var(--kyro-surface)] hover:text-[var(--kyro-text-primary)] transition-colors"
        >
          Minify
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(textValue);
          }}
          className="px-3 py-1.5 text-xs font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] rounded-md hover:bg-[var(--kyro-surface)] hover:text-[var(--kyro-text-primary)] transition-colors"
        >
          Copy
        </button>
        {parseError && (
          <span className="text-xs text-[var(--kyro-error)] ml-auto">
            {parseError}
          </span>
        )}
      </div>

      {/* Editor area */}
      <div
        className={`border border-[var(--kyro-border)] rounded-md overflow-hidden ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${error || parseError ? "border-[var(--kyro-error)]" : ""}`}
      >
        {viewMode === "text" ? (
          <textarea
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={disabled}
            rows={8}
            className={`w-full p-4 font-mono text-sm resize-y focus:outline-none bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)]`}
            placeholder='{"key": "value"}'
          />
        ) : (
          <div
            className={`p-4 max-h-[400px] overflow-auto bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)]`}
          >
            {treeData ? (
              <TreeView data={treeData} />
            ) : (
              <p className="text-sm text-[var(--kyro-text-muted)] italic">
                Invalid JSON - switch to Text view to fix
              </p>
            )}
          </div>
        )}
      </div>

      {!!field.admin?.description && !error && !parseError && (
        <p className="kyro-form-help">{(field as any).admin.description}</p>
      )}
      {(error || parseError) && (
        <p className="kyro-form-error">{error || parseError}</p>
      )}
    </div>
  );
};

// Tree view component
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
        return "text-green-600";
      case "number":
        return "text-blue-600";
      case "boolean":
        return "text-purple-600";
      case "null":
        return "text-gray-500";
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
        className="flex items-center gap-2 cursor-pointer hover:bg-[var(--kyro-surface-accent)] rounded px-1 -ml-1"
        onClick={() => isExpandable && setCollapsed(!collapsed)}
      >
        {isExpandable && (
          <span className="text-[var(--kyro-text-muted)] text-xs">
            {collapsed ? "▶" : "▼"}
          </span>
        )}
        <span className="font-medium text-[var(--kyro-text-primary)]">
          {data.key}
        </span>
        <span className="text-[var(--kyro-text-muted)]">:</span>
        {isExpandable ? (
          <span className="text-xs text-[var(--kyro-text-muted)]">
            {collapsed ? getPreview(data) : data.type === "object" ? "{" : "["}
          </span>
        ) : (
          <span className={`font-mono text-sm ${getTypeColor(data.type)}`}>
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
