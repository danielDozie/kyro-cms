import React, { useCallback, useEffect, useState, Suspense, lazy } from "react";
import { githubLight } from "@uiw/codemirror-theme-github";
import { aura } from "@uiw/codemirror-theme-aura";
import type { CodeField as CodeFieldType } from "@kyro-cms/core/client";
import { useTheme } from "../ThemeProvider";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

interface CodeFieldProps {
  field: CodeFieldType;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const CodeMirrorEditor = lazy(() =>
  import("@uiw/react-codemirror").then((mod) => ({ default: mod.default })),
);

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "php", label: "PHP" },
  { value: "markdown", label: "Markdown" },
];

const languageExtensions: Record<string, () => Promise<unknown>> = {
  javascript: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ jsx: true, typescript: true }),
    ),
  typescript: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ jsx: true, typescript: true }),
    ),
  js: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ jsx: true }),
    ),
  jsx: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ jsx: true }),
    ),
  ts: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ typescript: true }),
    ),
  json: () => import("@codemirror/lang-json").then((m) => m.json()),
  css: () => import("@codemirror/lang-css").then((m) => m.css()),
  sql: () => import("@codemirror/lang-sql").then((m) => m.sql()),
  python: () => import("@codemirror/lang-python").then((m) => m.python()),
  html: () => import("@codemirror/lang-html").then((m) => m.html()),
  rust: () => import("@codemirror/lang-rust").then((m) => m.rust()),
  java: () => import("@codemirror/lang-java").then((m) => m.java()),
  cpp: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  c: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  php: () => import("@codemirror/lang-php").then((m) => m.php()),
  markdown: () => import("@codemirror/lang-markdown").then((m) => m.markdown()),
  py: () => import("@codemirror/lang-python").then((m) => m.python()),
};

export const CodeField: React.FC<CodeFieldProps> = ({
  field,
  value = "",
  onChange,
  error,
  disabled,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const { theme } = useTheme();
  const accent = theme.colors?.accent || theme.colors?.primary || "#6366f1";
  const language = field.language?.toLowerCase() || "javascript";

  useEffect(() => {
    setIsMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const loadExtensions = async () => {
      setLoading(true);
      try {
        const loader =
          languageExtensions[language] || languageExtensions.javascript;
        const ext = await loader();
        setExtensions([ext as Extension, EditorView.lineWrapping]);
      } catch (err) {
        console.error("Failed to load language extension:", err);
        setExtensions([EditorView.lineWrapping]);
      } finally {
        setLoading(false);
      }
    };
    loadExtensions();
  }, [language, isMounted]);

  const handleChange = useCallback(
    (val: string) => onChange?.(val),
    [onChange],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
    document.body.style.overflow = !isFullScreen ? "hidden" : "";
  }, [isFullScreen]);

  const codeMirrorTheme = isDark ? aura : githubLight;
  const langLabel =
    LANGUAGES.find((l) => l.value === language)?.label || language;

  const hexToRgba = (hex: string, alpha: number = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (!isMounted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-24 rounded bg-[var(--kyro-surface-accent)] animate-pulse" />
          <div className="h-5 w-16 rounded bg-[var(--kyro-surface-accent)] animate-pulse" />
        </div>
        <div className="h-[280px] rounded-xl bg-[var(--kyro-surface-accent)] animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="group"
      style={
        {
          "--accent": accent,
          "--accent-light": hexToRgba(accent, 0.1),
          "--accent-light-2": hexToRgba(accent, 0.05),
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--kyro-text-primary)]">
            {field.label || field.name}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors"
            style={{
              backgroundColor: loading ? "var(--kyro-surface-accent)" : accent,
              color: loading ? "var(--kyro-text-muted)" : "white",
            }}
          >
            {loading ? "..." : langLabel}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] px-2 py-0.5 rounded font-medium transition-all"
            style={{
              backgroundColor: copied
                ? "var(--kyro-success)"
                : "var(--kyro-surface-accent)",
              color: copied ? "white" : "var(--kyro-text-secondary)",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={toggleFullScreen}
            className="text-[10px] px-2 py-0.5 rounded font-medium bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] transition-all"
            style={{ color: "var(--kyro-text-secondary)" }}
          >
            {isFullScreen ? "Exit" : "Expand"}
          </button>
        </div>
      </div>

      {/* Editor container */}
      <div
        className={`relative rounded-md overflow-hidden transition-all duration-200 w-full max-w-full ${
          isFullScreen ? "fixed inset-4 z-50" : ""
        }`}
        style={{
          backgroundColor: "var(--kyro-surface)",
          borderColor: error ? "var(--kyro-error)" : "var(--kyro-border)",
          borderWidth: "1px",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-200"
          style={{ backgroundColor: accent }}
        />

        <Suspense
          fallback={
            <div
              className="h-[280px] flex items-center justify-center"
              style={{ backgroundColor: "var(--kyro-surface)" }}
            >
              <div
                className="w-6 h-6 rounded-full animate-spin"
                style={{
                  borderColor: "var(--kyro-border)",
                  borderTopColor: accent,
                  borderWidth: "2px",
                }}
              />
            </div>
          }
        >
          <CodeMirrorEditor
            value={value == null ? "" : value}
            height={isFullScreen ? "calc(100vh - 100px)" : "280px"}
            width="100%"
            extensions={extensions}
            theme={codeMirrorTheme}
            onChange={handleChange}
            editable={!disabled}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              foldGutter: true,
            }}
            style={{
              fontSize: "13px",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          />
        </Suspense>

        {/* Error message */}
        {error && (
          <div
            className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs font-medium"
            style={{
              backgroundColor: "var(--kyro-danger-bg)",
              color: "var(--kyro-error)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between mt-2 text-[10px]"
        style={{ color: "var(--kyro-text-muted)" }}
      >
        <span>{value.split("\n").length} lines</span>
      </div>
    </div>
  );
};

export default CodeField;
