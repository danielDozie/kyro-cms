import React from "react";
import { ChevronRight } from "./icons";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function JsonNode({ value, depth = 0 }: { value: any; depth?: number }) {
  const [collapsed, setCollapsed] = React.useState(depth > 2);
  const toggle = () => setCollapsed(!collapsed);

  if (value === null || value === undefined) {
    return <span className="text-[#888] font-medium">null</span>;
  }

  if (typeof value === "boolean") {
    return <span className="text-[#e67e22] font-medium">{String(value)}</span>;
  }

  if (typeof value === "number") {
    return <span className="text-[#3498db] font-medium">{value}</span>;
  }

  if (typeof value === "string") {
    const max = 120;
    const display = value.length > max ? value.slice(0, max) + "…" : value;
    return <span className="text-[#27ae60]">"{display}"</span>;
  }

  if (Array.isArray(value)) {
    const count = value.length;
    const isEmpty = count === 0;

    return (
      <div>
        <button onClick={toggle} className="inline-flex items-baseline gap-0.5 text-[11px] font-mono text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] transition-colors cursor-pointer !bg-transparent !border-none !p-0 !m-0">
          {isEmpty ? (
            <span className="text-[var(--kyro-text-muted)]">[]</span>
          ) : (
            <>
              {collapsed ? <ChevronRight className="w-2.5 h-2.5 self-center" /> : <ChevronDown className="w-2.5 h-2.5 self-center" />}
              <span className="text-[#2980b9]">[</span>
              {collapsed && (
                <span className="text-[var(--kyro-text-muted)] truncate max-w-[200px] inline-block">
                  {count <= 2
                    ? value.map((v: any, i: number) => (
                      <span key={i}>
                        {i > 0 && <span className="text-[var(--kyro-text-muted)]">, </span>}
                        <JsonNode value={v} depth={depth + 1} />
                      </span>
                    ))
                    : `${count} items`
                  }
                </span>
              )}
              <span className="text-[#2980b9]">]</span>
              {collapsed && <span className="text-[10px] ml-1 text-[#2980b9]">{count}</span>}
            </>
          )}
        </button>
        {!isEmpty && !collapsed && (
          <div className="border-l border-[#2980b9]/20 ml-[6px] pl-3">
            {value.map((item, i) => (
              <div key={i} className="text-[11px] font-mono leading-relaxed">
                <span className="text-[#2980b9] select-none">{i}: </span>
                <JsonNode value={item} depth={depth + 1} />
                {i < count - 1 && <span className="text-[var(--kyro-text-muted)]">,</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    const count = keys.length;
    const isEmpty = count === 0;

    return (
      <div>
        <button onClick={toggle} className="inline-flex items-baseline gap-0.5 text-[11px] font-mono text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] transition-colors cursor-pointer !bg-transparent !border-none !p-0 !m-0">
          {isEmpty ? (
            <span className="text-[var(--kyro-text-muted)]">{"{}"}</span>
          ) : (
            <>
              {collapsed ? <ChevronRight className="w-2.5 h-2.5 self-center" /> : <ChevronDown className="w-2.5 h-2.5 self-center" />}
              <span className="text-[#8e44ad]">{"{"}</span>
              {collapsed && (
                <span className="text-[var(--kyro-text-muted)] truncate max-w-[200px] inline-block">
                  {keys.slice(0, 3).join(", ")}{count > 3 ? "…" : ""}
                </span>
              )}
              <span className="text-[#8e44ad]">{"}"}</span>
              {collapsed && <span className="text-[10px] ml-1 text-[#8e44ad]">{count}</span>}
            </>
          )}
        </button>
        {!isEmpty && !collapsed && (
          <div className="border-l border-[#8e44ad]/20 ml-[6px] pl-3">
            {keys.map((k, i) => (
              <div key={k} className="text-[11px] font-mono leading-relaxed">
                <span className="text-[#8e44ad]">{k}: </span>
                <JsonNode value={value[k]} depth={depth + 1} />
                {i < count - 1 && <span className="text-[var(--kyro-text-muted)]">,</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}
