import "../lib/i18n";
import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  Suspense,
  lazy,
} from "react";
import { useIsMounted } from "../hooks/useIsMounted";
import {
  Book,
  Trash2,
  Copy,
  RefreshCw,
  ChevronRight,
  Activity,
  Zap,
  Info,
  X,
  Download,
  Check,
  Code2,
  Play,
  Clock,
  Terminal,
  Search,
} from "./ui/icons";
import { JsonNode } from "./ui/JsonNode";

function JsonViewer({ json }: { json: string }) {
  const parsed = React.useMemo(() => {
    try { return JSON.parse(json); } catch { return json; }
  }, [json]);

  if (typeof parsed === "string") {
    return <pre className="text-[11px] font-mono text-[var(--kyro-text-primary)] whitespace-pre-wrap selection:bg-[var(--kyro-primary)]/20">{json}</pre>;
  }

  return <JsonNode value={parsed} />;
}

interface GraphQLPlaygroundProps {
  endpoint?: string;
  initialQuery?: string;
  initialVariables?: string;
  initialShowDocs?: boolean;
}

interface QueryTab {
  id: string;
  query: string;
  variables: string;
  headers: string;
}

interface HistoryEntry {
  id: string;
  query: string;
  variables: string;
  response: string;
  timestamp: number;
  duration: number;
  statusCode: number;
}

const CodeMirrorEditor = lazy(() =>
  import("@uiw/react-codemirror").then((mod) => ({ default: mod.default })),
);
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { CompletionContext, autocompletion } from "@codemirror/autocomplete";
import { aura } from "@uiw/codemirror-theme-aura";
import { useTranslation } from "react-i18next";

function prettifyQuery(query: string): string {
  let indent = 0;
  let result = "";
  const lines = query.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("}") || trimmed.startsWith("]")) indent = Math.max(0, indent - 1);
    result += "  ".repeat(indent) + trimmed + "\n";
    if (trimmed.endsWith("{") || trimmed.endsWith("[")) indent++;
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    indent += opens - closes;
  }
  return result.trim();
}

function resolveTypeName(type: Record<string, unknown>): string {
  if (!type) return "Unknown";
  if (type.name) return type.name as string;
  if (type.ofType) return resolveTypeName(type.ofType as Record<string, unknown>);
  return "Unknown";
}

function isScalarType(typeName: string): boolean {
  return ["String", "Int", "Float", "Boolean", "ID"].includes(typeName);
}

function renderType(type: Record<string, unknown>): string {
  if (!type) return "Unknown";
  if (type.name) return type.name as string;
  if (type.ofType) {
    if (type.kind === "NON_NULL") return `${renderType(type.ofType as Record<string, unknown>)}!`;
    if (type.kind === "LIST") return `[${renderType(type.ofType as Record<string, unknown>)}]`;
    return renderType(type.ofType as Record<string, unknown>);
  }
  return "Unknown";
}

function resolveInnermostKind(type: Record<string, unknown>): string {
  let current: Record<string, unknown> | undefined = type;
  while (current && current.ofType) current = current.ofType as Record<string, unknown>;
  return (current?.kind as string) || "Unknown";
}

function generateSkeletonQuery(field: FieldInfo, schema: SchemaInfo, isMutation: boolean): string {
  const returnTypeName = resolveTypeName(field.type);
  const returnType = schema.types.find((t) => t.name === returnTypeName);

  function buildTypeMap(): Map<string, TypeInfo> {
    const m = new Map<string, TypeInfo>();
    for (const t of schema.types) m.set(t.name, t);
    return m;
  }
  const localTypeMap = buildTypeMap();

  function collectFieldsWithUnions(fields: FieldInfo[], indent: number, _typeMap: Map<string, TypeInfo>): string[] {
    const lines: string[] = [];
    for (const f of fields) {
      if (f.isDeprecated) continue;
      const typeName = resolveTypeName(f.type);
      const returnInfo = _typeMap.get(typeName);
      const pad = "  ".repeat(indent);
      if (isScalarType(typeName) || typeName === "JSON") {
        lines.push(`${pad}${f.name}`);
      } else if (returnInfo && (returnInfo.kind === "UNION" || returnInfo.kind === "INTERFACE")) {
        lines.push(`${pad}${f.name} {`);
        lines.push(`${pad}  __typename`);
        for (const pt of returnInfo.possibleTypes || []) {
          const ptInfo = _typeMap.get(pt.name);
          if (!ptInfo?.fields) continue;
          lines.push(`${pad}  ... on ${pt.name} {`);
          for (const pf of ptInfo.fields) {
            if (pf.isDeprecated) continue;
            const pfTypeName = resolveTypeName(pf.type);
            const pfPad = "  ".repeat(indent + 2);
            if (isScalarType(pfTypeName) || pfTypeName === "JSON") {
              lines.push(`${pfPad}${pf.name}`);
            } else {
              lines.push(`${pfPad}${pf.name} { id }`);
            }
          }
          lines.push(`${pad}  }`);
        }
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}${f.name} { id }`);
      }
    }
    return lines;
  }

  const docField = returnType?.fields?.find((f) => f.name === "doc");
  const messageField = returnType?.fields?.find((f) => f.name === "message");

  let selection = "";

  if (docField && isMutation) {
    const docTypeName = resolveTypeName(docField.type);
    const docType = schema.types.find((t) => t.name === docTypeName);
    const docLines = collectFieldsWithUnions(docType?.fields?.filter((f) => !f.isDeprecated) || [], 1, localTypeMap);
    selection = ["  doc {", ...docLines, "  }"]
      .concat(messageField ? ["  message"] : [])
      .join("\n");
  } else {
    selection = collectFieldsWithUnions(returnType?.fields || [], 1, localTypeMap).join("\n");
  }

  const args = field.args
    ?.filter((a) => {
      const t = renderType(a.type);
      return t.endsWith("!");
    })
    .map((a) => {
      const t = renderType(a.type).replace("!", "");
      const val = t === "String" ? '""' : t === "Int" ? "0" : t === "Float" ? "0" : t === "Boolean" ? "false" : '""';
      return `${a.name}: ${val}`;
    })
    .join(", ");

  const fieldCall = `${field.name}${args ? `(${args})` : ""}`;

  if (isMutation) {
    return `mutation {\n  ${fieldCall} {\n${selection}\n  }\n}`;
  }
  return `query {\n  ${fieldCall} {\n${selection}\n  }\n}`;
}

function buildSchemaCompletionOverride(schema: SchemaInfo) {
  const queryType = schema.types.find((t) => t.name === schema.queryType.name);
  const mutationType = schema.mutationType
    ? schema.types.find((t) => t.name === schema.mutationType!.name)
    : null;

  const queryFields = queryType?.fields || [];
  const mutationFields = mutationType?.fields || [];

  const operationNames = [...queryFields.map((f) => f.name), ...mutationFields.map((f) => f.name)];

  return (context: CompletionContext) => {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: [
        ...operationNames.map((n) => ({
          label: n,
          type: "function" as const,
          detail: "operation",
        })),
        { label: "query", type: "keyword" as const, detail: "operation type" },
        { label: "mutation", type: "keyword" as const, detail: "operation type" },
      ],
    };
  };
}

const DEFAULT_QUERY = `# Welcome to Kyro CMS GraphQL Playground
# Cmd+Enter to run, Cmd+Shift+P to prettify

{
  __schema {
    types {
      name
      kind
      fields {
        name
        type { name kind }
      }
    }
  }
}

# Example: fetch all posts (uncomment to use)
# {
#   posts(page: 1, limit: 10) {
#     docs { id title slug status }
#     totalDocs
#   }
# }
`;

interface TypeInfo {
  name: string;
  kind: string;
  description?: string;
  fields?: FieldInfo[];
  inputFields?: FieldInfo[];
  enumValues?: { name: string; description?: string; isDeprecated: boolean }[];
  possibleTypes?: { name: string; kind: string }[];
  interfaces?: { name: string; kind: string }[];
  isDeprecated?: boolean;
}

interface FieldInfo {
  name: string;
  description?: string;
  type: { name?: string; kind?: string; ofType?: Record<string, unknown> };
  args: ArgInfo[];
  isDeprecated?: boolean;
  deprecationReason?: string;
}

interface ArgInfo {
  name: string;
  description?: string;
  type: { name?: string; kind?: string; ofType?: Record<string, unknown> };
  defaultValue?: string;
}

interface SchemaInfo {
  queryType: { name: string };
  mutationType?: { name: string };
  subscriptionType?: { name: string };
  types: TypeInfo[];
}

import { ClientOnly } from "./ui/ClientOnly";

function GraphQLPlaygroundSkeleton() {
  return (
    <div className="surface-tile p-8 space-y-6 rounded-lg animate-pulse h-[calc(100vh-120px)]">
      <div className="h-10 bg-[var(--kyro-border)] rounded-xl w-1/3 opacity-50" />
      <div className="h-full bg-[var(--kyro-surface-accent)] rounded-lg opacity-50" />
    </div>
  );
}

function GraphQLPlaygroundInner({
  endpoint = "/api/graphql",
  initialQuery,
  initialVariables,
  initialShowDocs = false,
}: GraphQLPlaygroundProps) {

  const { t } = useTranslation();
  const [token, setToken] = useState<string>("");
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tab, setTab] = useState<QueryTab>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kyro_graphql_tab");
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return {
      id: "default",
      query: initialQuery || DEFAULT_QUERY,
      variables: initialVariables || "{}",
      headers: "",
    };
  });
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<"query" | "variables" | "headers">("query");
  const [showDocs, setShowDocs] = useState(initialShowDocs);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [selectedType, setSelectedType] = useState<TypeInfo | null>(null);
  const [rightTab, setRightTab] = useState<"response" | "docs" | "history">(
    initialShowDocs ? "docs" : "response",
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kyro_graphql_history");
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return [];
  });
  const [lastDuration, setLastDuration] = useState<number>(0);
  const [lastStatus, setLastStatus] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const [mobilePanel, setMobilePanel] = useState<"editor" | "response">("editor");
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorPos = useRef({ line: 1, col: 1 });

  useEffect(() => {
    localStorage.setItem("kyro_graphql_tab", JSON.stringify(tab));
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("kyro_graphql_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchSchema = useCallback(async () => {
    setLoadingSchema(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            {
              __schema {
                queryType { name }
                mutationType { name }
                subscriptionType { name }
                types {
                  name
                  kind
                  description
                  fields {
                    name
                    description
                    type { name kind ofType { name kind ofType { name kind } } }
                    args {
                      name
                      description
                      type { name kind ofType { name kind } }
                      defaultValue
                    }
                    isDeprecated
                    deprecationReason
                  }
                  inputFields {
                    name
                    description
                    type { name kind ofType { name kind } }
                    defaultValue
                  }
                  enumValues {
                    name
                    description
                    isDeprecated
                  }
                  possibleTypes { name kind }
                  interfaces { name kind }
                }
              }
            }
          `,
        }),
      });
      const data = await response.json();
      if (data.data && data.data.__schema) {
        setSchema(data.data.__schema);
        setIsConnected(true);
      }
    } catch (err) {
      console.error("Failed to fetch schema", err);
    } finally {
      setLoadingSchema(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (showDocs && !schema) fetchSchema();
  }, [showDocs, schema, fetchSchema]);

  const [searchQuery, setSearchQuery] = useState("");

  const typeMap = useMemo(() => {
    const m = new Map<string, TypeInfo>();
    if (!schema) return m;
    for (const t of schema.types) {
      m.set(t.name, t);
    }
    return m;
  }, [schema]);

  interface SearchResult {
    typeName: string;
    fieldPath: string;
    typeInfo: TypeInfo;
    fieldInfo?: FieldInfo;
  }

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !schema) return [];
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    const seenLabels = new Set<string>();

    for (const type of schema.types) {
      if (type.name.startsWith("__")) continue;
      const typeMatch = type.name.toLowerCase().includes(q);

      if (typeMatch && !seenLabels.has(type.name)) {
        seenLabels.add(type.name);
        results.push({ typeName: type.name, fieldPath: type.name, typeInfo: type });
      }

      if (type.fields) {
        for (const field of type.fields) {
          const fieldMatch = field.name.toLowerCase().includes(q);
          if (fieldMatch) {
            const label = `${type.name} > ${field.name}`;
            if (!seenLabels.has(label)) {
              seenLabels.add(label);
              results.push({ typeName: type.name, fieldPath: label, typeInfo: type, fieldInfo: field });
            }
          }

          if (q.length >= 2) {
            const rtName = resolveTypeName(field.type);
            const rt = typeMap.get(rtName);
            if (rt?.fields && (fieldMatch || results.some(r => r.fieldInfo === field))) {
              for (const sub of rt.fields) {
                if (sub.name.toLowerCase().includes(q)) {
                  const label = `${type.name} > ${field.name} > ${sub.name}`;
                  if (!seenLabels.has(label)) {
                    seenLabels.add(label);
                    results.push({ typeName: type.name, fieldPath: label, typeInfo: type, fieldInfo: field });
                  }
                }
              }
            }
          }
        }
      }
    }

    return results;
  }, [searchQuery, schema, typeMap]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    const targetType = result.fieldInfo
      ? typeMap.get(resolveTypeName(result.fieldInfo.type)) || result.typeInfo
      : result.typeInfo;
    setSelectedType(targetType);
    setSearchQuery("");
  }, [typeMap]);

  function highlightMatch(text: string, query: string) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-[var(--kyro-primary)]/20 text-[var(--kyro-primary)] rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  const handleRun = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `ApiKey ${token}`;
      if (tab.headers) {
        try {
          const customHeaders = JSON.parse(tab.headers);
          Object.assign(headers, customHeaders);
        } catch { /* ignore invalid */ }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: tab.query,
          variables: tab.variables ? JSON.parse(tab.variables) : {},
        }),
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      setLastDuration(duration);
      setLastStatus(res.status);

      const data = await res.json();
      const formatted = JSON.stringify(data, null, 2);
      setResponse(formatted);
      if (data.errors) setError("Query returned errors");

      setHistory((prev) => [
        {
          id: Date.now().toString(),
          query: tab.query,
          variables: tab.variables,
          response: formatted,
          timestamp: Date.now(),
          duration,
          statusCode: res.status,
        },
        ...prev.slice(0, 49),
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      setResponse(JSON.stringify({ error: message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, token, tab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        handlePrettify();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRun]);

  const updateTab = (key: "query" | "variables" | "headers", value: string) => {
    setTab((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrettify = () => {
    const pretty = prettifyQuery(tab.query);
    setTab((prev) => ({ ...prev, query: pretty }));
  };

  const handleCopyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadResponse = () => {
    if (!response) return;
    const blob = new Blob([response], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graphql-response.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearEditor = () => {
    setTab((prev) => ({ ...prev, query: "" }));
  };

  const handleInsertQuery = useCallback(
    (field: FieldInfo) => {
      const isMutation = schema?.mutationType?.name
        ? schema.types
          .find((t) => t.name === schema.mutationType!.name)
          ?.fields?.some((f) => f.name === field.name)
        : false;
      if (!schema) return;
      const q = generateSkeletonQuery(field, schema, !!isMutation);
      setTab((prev) => ({ ...prev, query: q }));
      setRightTab("response");
    },
    [schema],
  );

  const queryExt = useMemo(() => [javascript(), schema ? autocompletion({ override: [buildSchemaCompletionOverride(schema)] }) : []].flat(), [schema]);
  const jsonExt = useMemo(() => [json()], []);
  const extensions = activeEditorTab === "query" ? queryExt : jsonExt;
  const theme = aura;

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(20, Math.min(80, pct)));
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const editorPills = [
    { key: "query" as const, label: "Query", shortcut: "" },
    { key: "variables" as const, label: "Variables", shortcut: "" },
    { key: "headers" as const, label: "Headers", shortcut: "" },
  ];

  const rightPills = [
    { key: "response" as const, label: "Response", badge: lastStatus ? `${lastStatus}ms` : undefined },
    { key: "docs" as const, label: "Docs" },
    { key: "history" as const, label: `History${history.length ? ` (${history.length})` : ""}` },
  ];

  const editorValue =
    activeEditorTab === "query"
      ? tab.query
      : activeEditorTab === "variables"
        ? tab.variables
        : tab.headers;

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-[var(--kyro-bg)] overflow-hidden rounded-lg border border-[var(--kyro-border)]">
      {/* Compact top bar */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)] shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--kyro-primary)]/10 flex items-center justify-center text-[var(--kyro-primary)] shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold hidden sm:inline">GraphQL</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--kyro-text-muted)]">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[var(--kyro-success)]" : "bg-[var(--kyro-danger)]"}`} />
          <span className="hidden sm:inline">{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
        <div className="h-4 w-px bg-[var(--kyro-border)]" />
        {token ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] text-[10px] font-mono text-[var(--kyro-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--kyro-success)]" />
            API Key ••••{token.slice(-4)}
            <button onClick={() => { setToken(""); setShowToken(false); }} className="ml-1 hover:text-[var(--kyro-danger)]">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("fields.apiKey", { defaultValue: "API key" })}
              className="w-24 px-2 py-1 text-[10px] font-mono bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-md text-[var(--kyro-text-primary)] placeholder:text-[var(--kyro-text-muted)] focus:outline-none focus:border-[var(--kyro-primary)]"
            />
            <button onClick={() => setShowToken(!showToken)} className="p-1 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)]">
              {showToken ? <X className="w-3 h-3" /> : <Info className="w-3 h-3" />}
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
          <button onClick={() => { setShowDocs(!showDocs); setRightTab("docs"); }} className={`p-1.5 rounded-lg transition-all ${rightTab === "docs" && showDocs ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]" : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"}`} title={t("tooltips.schemaDocs", { defaultValue: "Schema docs" })}>
            <Book className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setRightTab("history")} className={`p-1.5 rounded-lg transition-all ${rightTab === "history" ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]" : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"}`} title={t("tooltips.history", { defaultValue: "History" })}>
            <Clock className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePrettify} className="p-1.5 rounded-lg text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]" title={t("tooltips.prettifyCmdshiftp", { defaultValue: "Prettify (Cmd+Shift+P)" })}>
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCopyResponse} className="p-1.5 rounded-lg text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]" title={t("tooltips.copyResponse", { defaultValue: "Copy response" })}>
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--kyro-success)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleDownloadResponse} className="p-1.5 rounded-lg text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]" title={t("tooltips.downloadResponse", { defaultValue: "Download response" })}>
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleClearEditor} className="p-1.5 rounded-lg text-[var(--kyro-text-muted)] hover:text-[var(--kyro-danger)] hover:bg-[var(--kyro-danger-bg)]" title={t("tooltips.clearEditor", { defaultValue: "Clear editor" })}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-px bg-[var(--kyro-border)] mx-1" />
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            <Play className="w-3 h-3" />
            {isLoading ? "..." : "Run"}
          </button>
        </div>
      </div>

      {/* Main split area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Mobile panel switcher */}
        <div className="flex md:hidden gap-1 px-3 py-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)] shrink-0">
          <button
            onClick={() => setMobilePanel("editor")}
            className={`flex-1 px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all ${mobilePanel === "editor" ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]" : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"}`}
          >
            Editor
          </button>
          <button
            onClick={() => setMobilePanel("response")}
            className={`flex-1 px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all ${mobilePanel === "response" ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]" : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"}`}
          >
            Output
          </button>
        </div>

        {/* Left: editor */}
        <div className={`${mobilePanel === "editor" ? "flex" : "hidden"} md:flex flex-col overflow-hidden border-r border-[var(--kyro-border)] w-full md:w-auto`} style={{ flex: 'none', width: isDesktop ? `${splitPos}%` : "100%" }}>
          {/* Editor pills */}
          <div className="flex gap-0.5 px-3 py-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
            {editorPills.map((p) => (
              <button
                key={p.key}
                onClick={() => setActiveEditorTab(p.key)}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${activeEditorTab === p.key
                  ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]"
                  : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* CodeMirror */}
          <div className="flex-1 overflow-hidden relative bg-[var(--kyro-bg)]">
            <Suspense fallback={<div className="p-3 text-[10px] text-[var(--kyro-text-muted)]">Loading editor...</div>}>
              <CodeMirrorEditor
                value={editorValue}
                height="100%"
                extensions={extensions}
                theme={theme}
                onChange={(val) => updateTab(activeEditorTab, val)}
                basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                style={{
                  height: "100%",
                  fontSize: "12px",
                  fontFamily: "'Fira Code', monospace",
                }}
              />
            </Suspense>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 border-t border-[var(--kyro-border)] bg-[var(--kyro-surface)] text-[9px] text-[var(--kyro-text-muted)] font-mono">
            <span>Ln {cursorPos.current.line}, Col {cursorPos.current.col}</span>
            <span>{tab.query.length} chars</span>
          </div>
        </div>

        {/* Drag handle */}
        <div
          className="hidden md:block absolute top-0 bottom-0 z-10 w-1.5 cursor-col-resize group"
          style={{ left: `calc(${splitPos}% - 3px)` }}
          onMouseDown={startDrag}
        >
          <div className="w-0.5 h-full mx-auto bg-transparent group-hover:bg-[var(--kyro-primary)] group-hover:opacity-40 transition-all" />
        </div>

        {/* Right panel */}
        <div className={`${mobilePanel === "response" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden min-w-0 w-full md:w-auto`} style={{ flex: undefined, width: isDesktop ? `${100 - splitPos}%` : "100%" }}>
          {/* Right pills */}
          <div className="flex gap-0.5 px-3 py-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
            {rightPills.map((p) => (
              <button
                key={p.key}
                onClick={() => { setRightTab(p.key); if (p.key === "docs") setShowDocs(true); }}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${rightTab === p.key
                  ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]"
                  : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === "docs" ? (
              <div className="h-full flex flex-col overflow-hidden bg-[var(--kyro-surface)]">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--kyro-border)]">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--kyro-text-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("fields.searchTypesAndFields", { defaultValue: "Search types and fields..." })}
                      className="w-full pl-7 pr-6 py-1 text-[10px] bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-md text-[var(--kyro-text-primary)] placeholder:text-[var(--kyro-text-muted)] focus:outline-none focus:border-[var(--kyro-primary)]"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)]">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => setShowDocs(false)} className="text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {loadingSchema ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="w-5 h-5 animate-spin text-[var(--kyro-primary)]" />
                    </div>
                  ) : schema ? (
                    <div className="space-y-4">
                      {searchQuery ? (
                        <div className="space-y-1">
                          {searchResults.length === 0 ? (
                            <p className="text-[10px] text-[var(--kyro-text-muted)] py-4 text-center">No results for "{searchQuery}"</p>
                          ) : (
                            searchResults.map((r, i) => {
                              const targetType = r.fieldInfo ? typeMap.get(resolveTypeName(r.fieldInfo.type)) || r.typeInfo : r.typeInfo;
                              return (
                                <button
                                  key={r.fieldPath + i}
                                  onClick={() => handleSearchSelect(r)}
                                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-all text-left group"
                                >
                                  <span className="text-[10px] font-mono text-[var(--kyro-text-muted)]">
                                    {r.fieldPath.split(" > ").map((part, j) => (
                                      <span key={j}>
                                        {j > 0 && <span className="mx-1 opacity-40">›</span>}
                                        <span className={j === r.fieldPath.split(" > ").length - 1 ? "text-[var(--kyro-text-primary)] font-semibold" : "text-[var(--kyro-text-muted)]"}>
                                          {highlightMatch(part, searchQuery)}
                                        </span>
                                      </span>
                                    ))}
                                    {targetType && (targetType.kind === "UNION" || targetType.kind === "INTERFACE") && (
                                      <span className="ml-2 text-[9px] font-mono text-[var(--kyro-primary)] bg-[var(--kyro-primary)]/10 px-1 py-0.5 rounded">⧉</span>
                                    )}
                                  </span>
                                  <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-60" />
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : selectedType ? (
                        <div className="space-y-3">
                          <button
                            onClick={() => setSelectedType(null)}
                            className="flex items-center gap-1 text-[10px] text-[var(--kyro-primary)] font-semibold hover:underline"
                          >
                            ← Back to types
                          </button>
                          <div>
                            <h3 className="text-sm font-bold text-[var(--kyro-text-primary)]">{selectedType.name}</h3>
                            <p className="text-[10px] text-[var(--kyro-text-muted)] italic">{selectedType.kind}</p>
                            {selectedType.description && (
                              <p className="mt-1.5 text-[11px] text-[var(--kyro-text-secondary)] leading-relaxed">{selectedType.description}</p>
                            )}
                          </div>
                          {selectedType.kind === "UNION" && selectedType.possibleTypes && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold tracking-wider text-[var(--kyro-text-muted)] pt-3">Possible Types <span className="text-[8px] font-mono text-[var(--kyro-primary)] bg-[var(--kyro-primary)]/10 px-1 py-0.5 rounded ml-1">⧉ fragment</span></h4>
                              <div className="space-y-1">
                                {selectedType.possibleTypes.map(pt => (
                                  <button
                                    key={pt.name}
                                    onClick={() => {
                                      const t = typeMap.get(pt.name);
                                      if (t) setSelectedType(t);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-all text-left group"
                                  >
                                    <span className="text-[11px] font-medium text-[var(--kyro-text-primary)]">{pt.name}</span>
                                    <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-60" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedType.kind === "INTERFACE" && selectedType.possibleTypes && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold tracking-wider text-[var(--kyro-text-muted)] pt-3">Implementing Types <span className="text-[8px] font-mono text-[var(--kyro-text-muted)] bg-[var(--kyro-surface)] px-1 py-0.5 rounded border border-[var(--kyro-border)] ml-1">interface</span></h4>
                              <div className="space-y-1">
                                {selectedType.possibleTypes.map(pt => (
                                  <button
                                    key={pt.name}
                                    onClick={() => {
                                      const t = typeMap.get(pt.name);
                                      if (t) setSelectedType(t);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-all text-left group"
                                  >
                                    <span className="text-[11px] font-medium text-[var(--kyro-text-primary)]">{pt.name}</span>
                                    <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-60" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedType.fields && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold tracking-wider text-[var(--kyro-text-muted)] pt-3">Fields</h4>
                              {selectedType.fields.map(f => {
                                const isRootOp = (selectedType.name === "Query" || selectedType.name === "Mutation") && !!schema;
                                return (
                                  <button
                                    key={f.name}
                                    type="button"
                                    onClick={isRootOp ? () => handleInsertQuery(f) : undefined}
                                    className={`w-full text-left p-2.5 bg-[var(--kyro-surface-accent)] rounded-lg border border-[var(--kyro-border)] transition-all ${isRootOp ? "hover:border-[var(--kyro-primary)] hover:shadow-sm cursor-pointer" : ""}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-[11px] text-[var(--kyro-text-primary)]">{f.name}</span>
                                      <span className="flex items-center gap-1">
                                        {(() => {
                                          const rtName = resolveTypeName(f.type);
                                          const rt = typeMap.get(rtName);
                                          const isUnionish = rt && (rt.kind === "UNION" || rt.kind === "INTERFACE");
                                          return isUnionish ? (
                                            <span className="text-[9px] font-mono text-[var(--kyro-primary)] bg-[var(--kyro-primary)]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                              ⧉
                                              <span className="text-[8px] opacity-70">fragment</span>
                                            </span>
                                          ) : null;
                                        })()}
                                        <span className="text-[9px] font-mono text-[var(--kyro-primary)] bg-[var(--kyro-primary)]/10 px-1.5 py-0.5 rounded">{renderType(f.type)}</span>
                                      </span>
                                    </div>
                                    {f.description && <p className="text-[10px] text-[var(--kyro-text-secondary)] mt-1">{f.description}</p>}
                                    {(() => {
                                      const rtName = resolveTypeName(f.type);
                                      const rt = typeMap.get(rtName);
                                      if (rt && (rt.kind === "UNION" || rt.kind === "INTERFACE") && rt.possibleTypes?.length) {
                                        return (
                                          <div className="mt-1.5 pl-3 border-l-2 border-[var(--kyro-primary)]/30 space-y-0.5">
                                            <span className="text-[8px] font-semibold text-[var(--kyro-text-muted)] uppercase tracking-wider">Possible Types</span>
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                              {rt.possibleTypes.map(pt => {
                                                const ptInfo = typeMap.get(pt.name);
                                                const hasFragment = ptInfo && (ptInfo.kind === "OBJECT" || ptInfo.kind === "INTERFACE");
                                                return (
                                                  <span key={pt.name} className="text-[9px] font-mono text-[var(--kyro-text-muted)] bg-[var(--kyro-surface)] px-1.5 py-0.5 rounded border border-[var(--kyro-border)]">
                                                    {pt.name}
                                                    {hasFragment && <span className="ml-1 text-[8px] text-[var(--kyro-primary)]">⧉</span>}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                    {f.args && f.args.length > 0 && (
                                      <div className="mt-1.5 pl-3 border-l-2 border-[var(--kyro-border)] space-y-0.5">
                                        {f.args.map(a => (
                                          <div key={a.name} className="text-[9px]">
                                            <span className="text-[var(--kyro-text-muted)]">{a.name}:</span>{" "}
                                            <span className="text-[var(--kyro-primary)]">{renderType(a.type)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            {["Query", "Mutation"].map(t => {
                              const found = schema.types.find(type => type.name === t);
                              if (!found) return null;
                              return (
                                <button
                                  key={t}
                                  onClick={() => setSelectedType(found)}
                                  className="flex items-center justify-between p-3 bg-[var(--kyro-surface-accent)] rounded-md border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] transition-all text-left group"
                                >
                                  <div>
                                    <span className="text-[10px] font-semibold text-[var(--kyro-text-muted)] block">{t}</span>
                                    <span className="text-[11px] font-bold text-[var(--kyro-text-primary)]">Root Operations</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-[var(--kyro-primary)] group-hover:translate-x-1 transition-transform" />
                                </button>
                              );
                            })}
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] font-semibold tracking-wider text-[var(--kyro-text-muted)] pt-3">All Types</h4>
                            {schema.types.filter(t => !t.name.startsWith("__") && (t.kind === "OBJECT" || t.kind === "UNION" || t.kind === "INTERFACE")).map(t => (
                              <button
                                key={t.name}
                                onClick={() => setSelectedType(t)}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-all text-left group"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-medium text-[var(--kyro-text-primary)]">{t.name}</span>
                                  {t.kind === "UNION" && <span className="text-[8px] font-mono text-[var(--kyro-primary)] bg-[var(--kyro-primary)]/10 px-1 py-0.5 rounded">union</span>}
                                  {t.kind === "INTERFACE" && <span className="text-[8px] font-mono text-[var(--kyro-text-muted)] bg-[var(--kyro-surface)] px-1 py-0.5 rounded border border-[var(--kyro-border)]">interface</span>}
                                </div>
                                <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-60" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--kyro-text-muted)]">No schema loaded.</p>
                  )}
                </div>
              </div>
            ) : rightTab === "history" ? (
              <div className="h-full flex flex-col overflow-hidden bg-[var(--kyro-surface)]">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--kyro-border)]">
                  <span className="text-[10px] font-semibold text-[var(--kyro-text-secondary)]">Query History</span>
                  {history.length > 0 && (
                    <button onClick={() => setHistory([])} className="text-[9px] text-[var(--kyro-text-muted)] hover:text-[var(--kyro-danger)]">Clear</button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[var(--kyro-text-muted)]">
                      <Terminal className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-[10px]">No queries executed yet</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {history.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            setTab((prev) => ({ ...prev, query: entry.query, variables: entry.variables }));
                            setResponse(entry.response);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-[var(--kyro-surface-accent)] border border-transparent hover:border-[var(--kyro-border)] transition-all"
                        >
                          <div className="text-[10px] font-mono text-[var(--kyro-text-primary)] truncate leading-relaxed">
                            {entry.query.split("\n").slice(0, 3).join(" ").substring(0, 80)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-[var(--kyro-text-muted)]">
                            <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            <span>{entry.duration}ms</span>
                            <span className={`${entry.statusCode < 400 ? "text-[var(--kyro-success)]" : "text-[var(--kyro-danger)]"}`}>
                              {entry.statusCode}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
                  <span className="text-[10px] font-semibold text-[var(--kyro-text-secondary)]">Response</span>
                  {lastDuration > 0 && (
                    <span className="text-[9px] font-mono text-[var(--kyro-text-muted)]">
                      {lastDuration}ms
                    </span>
                  )}
                  {lastStatus > 0 && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${lastStatus < 400 ? "bg-[var(--kyro-success-bg)] text-[var(--kyro-success)]" : "bg-[var(--kyro-danger-bg)] text-[var(--kyro-danger)]"
                      }`}>
                      {lastStatus}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-auto bg-[var(--kyro-bg-secondary)]">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-[var(--kyro-primary)]" />
                      <span className="text-[10px] font-semibold text-[var(--kyro-text-muted)]">Running Query...</span>
                    </div>
                  ) : response ? (
                    <div className="h-full overflow-auto p-3">
                      {error && (
                        <div className="mb-2 p-2 rounded bg-[var(--kyro-danger-bg)] border border-[var(--kyro-danger)]/20 text-[10px] text-[var(--kyro-danger)] font-medium">
                          ⚠ {error}
                        </div>
                      )}
                      <JsonViewer json={response} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                      <Activity className="w-12 h-12 mb-3" />
                      <p className="text-[11px] font-bold">Press Run to execute</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GraphQLPlayground(props: GraphQLPlaygroundProps) {
  return (
    <ClientOnly fallback={<GraphQLPlaygroundSkeleton />}>
      <GraphQLPlaygroundInner {...props} />
    </ClientOnly>
  );
}
