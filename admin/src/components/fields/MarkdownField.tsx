import React, { useState, useCallback, useMemo, useEffect } from "react";
import type { MarkdownField as MarkdownFieldType } from "@kyro-cms/core/client";
import { useTranslation } from "react-i18next";

interface MarkdownFieldProps {
  field: MarkdownFieldType;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

// Simple markdown parser for basic formatting
function parseMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    // Code blocks
    .replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto my-2"><code>$2</code></pre>',
    )

    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm font-mono">$1</code>',
    )

    // Headers
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>',
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>',
    )
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')

    // Bold and Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")

    // Strikethrough
    .replace(/~~(.+?)~~/g, "<del>$1</del>")

    // Blockquotes
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2 text-gray-600 dark:text-gray-400">$1</blockquote>',
    )

    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
    )

    // Images
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded my-2" />',
    )

    // Horizontal rules
    .replace(
      /^---$/gm,
      '<hr class="border-gray-300 dark:border-gray-600 my-4" />',
    )
    .replace(
      /^\*\*\*$/gm,
      '<hr class="border-gray-300 dark:border-gray-600 my-4" />',
    )

    // Unordered lists
    .replace(/^[\*\-] (.+)$/gm, '<li class="ml-4">$1</li>')

    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

    // Paragraphs (lines that don't start with special chars)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p class="my-2">$1</p>')

    // Clean up empty paragraphs
    .replace(/<p class="my-2"><\/p>/g, "")

    // Wrap consecutive list items in ul/ol
    .replace(
      /(<li class="ml-4">.*<\/li>\n?)+/g,
      '<ul class="list-disc pl-6 my-2">$&</ul>',
    );

  return html;
}

export const MarkdownField: React.FC<MarkdownFieldProps> = ({
  field,
  value = "",
  onChange,
  error,
  disabled,
}) => {
    const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  const wordCount = useMemo(() => {
    if (!value) return 0;
    return value.trim().split(/\s+/).filter(Boolean).length;
  }, [value]);

  const characterCount = value?.length || 0;

  if (!isMounted) {
    return (
      <div className="kyro-form-field">
        <label className="kyro-form-label">
          {field.label || field.name}
          {field.required && (
            <span className="kyro-form-label-required">*</span>
          )}
        </label>
        <div className="h-[200px] bg-[var(--kyro-surface)] animate-pulse rounded-md border border-[var(--kyro-border)]" />
      </div>
    );
  }

  return (
    <div
      className="kyro-form-field"
      style={{ position: "relative", zIndex: 10, pointerEvents: "auto" }}
    >
      <div className="flex items-center justify-between mb-2">
        <label className="kyro-form-label">
          {field.label || field.name}
          {field.required && (
            <span className="kyro-form-label-required">*</span>
          )}
        </label>
        <div className="flex items-center gap-3">
          {/* Stats */}
          <span className="text-xs text-[var(--kyro-text-muted)]">
            {wordCount} words • {characterCount} chars
          </span>

          {/* Preview toggle */}
          <div className="flex rounded-md overflow-hidden border border-[var(--kyro-border)]">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                !showPreview
                  ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
                  : "bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                showPreview
                  ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
                  : "bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      <div
        style={{ pointerEvents: "auto", position: "relative", zIndex: 50 }}
        className={`border border-[var(--kyro-border)] rounded-md overflow-hidden ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${error ? "border-[var(--kyro-error)]" : ""}`}
      >
        {!showPreview ? (
          <textarea
            value={value == null ? "" : value}
            onChange={handleChange}
            disabled={disabled}
            rows={12}
            style={{ pointerEvents: "auto", cursor: "text", zIndex: 100 }}
            className={`w-full p-4 font-mono text-sm resize-y focus:outline-none bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)]`}
            placeholder={t("fields.enterMarkdownContentHeading", { defaultValue: "Enter markdown content...\n\n# Heading 1\n## Heading 2\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2\n\n[Link text](https://example.com)\n\n`inline code`\n\n```\ncode block\n```" })}
          />
        ) : (
          <div
            className={`p-6 min-h-[300px] overflow-auto bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)]`}
          >
            {value ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }}
              />
            ) : (
              <p className="text-[var(--kyro-text-muted)] italic">
                Nothing to preview
              </p>
            )}
          </div>
        )}
      </div>

      {/* Toolbar with markdown hints */}
      {!showPreview && (
        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--kyro-text-muted)]">
          <span>**bold**</span>
          <span>*italic*</span>
          <span>`code`</span>
          <span>[link](url)</span>
          <span># heading</span>
        </div>
      )}

      {((field.admin?.description as string | undefined) && !error) && (
        <p className="kyro-form-help">{field.admin?.description as string}</p>
      )}
      {error && <p className="kyro-form-error">{error}</p>}
    </div>
  );
};
