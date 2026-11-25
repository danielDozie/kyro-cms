import React, { useState } from "react";
import { createPortal } from "react-dom";
import { StudioPage, type StudioBlock, type StudioContext } from "@kyro-cms/studio";
const frameHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#fff;color:#201a17;font-family:Geist,Inter,Arial,sans-serif}[data-kyro-node-path]{position:relative;outline-offset:-2px;cursor:pointer}[data-kyro-node-path]:hover:not(:has([data-kyro-node-path]:hover)){outline:1px solid #ff570a}[data-kyro-field]:hover{outline:1px dashed #e85a22;outline-offset:4px}.studio-empty{padding:100px 24px;text-align:center;color:#777}.studio-empty strong{display:block;color:#222;font-size:24px;margin-bottom:12px}</style></head><body><div id="studio-frame-root"></div></body></html>`;
interface Props {
  blocks: StudioBlock[];
  selectedPath?: string;
  viewport: string;
  context?: StudioContext;
  theme?: "light" | "dark";
  interactive?: boolean;
  onSelect: (path: string, field?: string) => void;
}
export default function StudioFrame({
  blocks,
  selectedPath,
  viewport,
  context,
  theme = "light",
  interactive,
  onSelect,
}: Props) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  return (
    <iframe
      title="Live page canvas"
      className="visual-studio-frame"
      style={{ width: viewport === "mobile" ? 390 : viewport === "tablet" ? 768 : "100%" }}
      sandbox="allow-same-origin"
      srcDoc={frameHtml}
      onLoad={(event) => setTarget(event.currentTarget.contentDocument?.getElementById("studio-frame-root") || null)}
    >
      {target &&
        createPortal(
          <div
            onClickCapture={(event) => {
              const element = event.target as Element;
              const owner = element.closest<HTMLElement>("[data-kyro-node-path]");
              if (!owner) return;
              if (!interactive) {
                onSelect(
                  owner.dataset.kyroNodePath!,
                  element.closest<HTMLElement>("[data-kyro-field]")?.dataset.kyroField,
                );
                if (!element.closest("[data-kyro-interactive]")) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              } else if (element.closest("a,form")) event.preventDefault();
            }}
            onKeyDown={(event) => {
              if (interactive || !["Enter", " "].includes(event.key)) return;
              const owner = (event.target as Element).closest<HTMLElement>("[data-kyro-node-path]");
              if (owner) {
                event.preventDefault();
                onSelect(owner.dataset.kyroNodePath!);
              }
            }}
          >
            <style>{`html,body{background:${theme === "dark" ? "#151515" : "#fff"};color:${theme === "dark" ? "#f3ede7" : "#201a17"};color-scheme:${theme}}.studio-empty{color:${theme === "dark" ? "#a3a3a3" : "#777"}}.studio-empty strong{color:${theme === "dark" ? "#f4f4f4" : "#222"}}`}</style>
            {!interactive && selectedPath && (
              <style>{`[data-kyro-node-path="${selectedPath.replace(/[^\w.]/g, "")}"]{outline:2px solid #ff570a}`}</style>
            )}
            {blocks.length ? (
              <StudioPage blocks={blocks} editing context={context} theme={theme} />
            ) : (
              <div className="studio-empty">
                <strong>A blank canvas, ready for your ideas.</strong>
                <p>Insert a section, layout, or content component to start building.</p>
              </div>
            )}
          </div>,
          target,
        )}
    </iframe>
  );
}
