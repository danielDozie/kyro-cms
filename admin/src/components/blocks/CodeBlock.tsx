import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { ChevronRight, X, Code2 } from "../ui/icons";
import { CodeField } from "../fields/CodeField";
import { useTranslation } from "react-i18next";

interface CodeBlockData {
  language?: string;
  code?: string;
}

export const CodeBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock, removeBlock, moveBlock } = useBlockActions();
  const data = (blockData?.data ?? block.data ?? {}) as CodeBlockData;

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <div className="group/block relative border border-[var(--kyro-border)] rounded-2xl p-6 mb-6 transition-all duration-300 bg-[var(--kyro-surface)] hover:border-[var(--kyro-primary)]/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--kyro-primary)]/10 flex items-center justify-center text-[var(--kyro-primary)] transition-transform group-hover/block:scale-110">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-[var(--kyro-text-primary)]">Code Snippet</h4>
            <p className="text-[10px] font-medium text-[var(--kyro-text-muted)]  tracking-widest">
              Block Editor • {data.language || "javascript"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 opacity-0 group-hover/block:opacity-100 transition-all translate-x-2 group-hover/block:translate-x-0">
          <div className="flex bg-[var(--kyro-surface-accent)]/50 p-1 rounded-xl border border-[var(--kyro-border)]">
            <button
              type="button"
              onClick={() => moveBlock(block.id, "up")}
              className="p-1.5 hover:bg-[var(--kyro-surface)] rounded-lg transition-all text-[var(--kyro-text-muted)] hover:text-[var(--kyro-primary)]"
              title={t("tooltips.moveUp", { defaultValue: "Move up" })}
            >
              <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
            </button>
            <div className="w-px h-4 bg-[var(--kyro-border)] mx-1 self-center" />
            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              className="p-1.5 hover:bg-[var(--kyro-danger-bg)] rounded-lg transition-all text-[var(--kyro-text-muted)] hover:text-[var(--kyro-danger)]"
              title={t("tooltips.remove", { defaultValue: "Remove" })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <CodeField
          field={{
            type: "code",
            name: "code",
            label: "Source Code",
            language: data.language || "javascript"
          }}
          value={data.code || ""}
          onChange={(val) => handleChange("code", val)}
        />

        <div className="flex items-center gap-4 bg-[var(--kyro-surface-accent)]/20 p-4 rounded-xl border border-[var(--kyro-border)]/50">
          <div className="flex-1">
            <label className="text-[10px] font-bold  tracking-widest text-[var(--kyro-text-muted)] mb-2 block">
              Syntax Highlighting
            </label>
            <div className="relative">
              <select
                value={data.language || "javascript"}
                onChange={(e) => handleChange("language", e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-xl text-xs font-medium text-[var(--kyro-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)]/20 focus:border-[var(--kyro-primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="plaintext">Plain Text</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="json">JSON</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
                <option value="rust">Rust</option>
                <option value="markdown">Markdown</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--kyro-text-muted)]">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-[var(--kyro-border)]" />

          <div className="hidden sm:flex flex-col justify-center">
            <span className="text-[10px] font-bold  tracking-widest text-[var(--kyro-text-muted)] mb-2">
              Status
            </span>
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-xl">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-medium text-[var(--kyro-text-primary)] tracking-wide">EDITING</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
