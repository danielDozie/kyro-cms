import "../../lib/i18n";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import type { Field } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";
import { SlidePanel } from "../ui/SlidePanel";
import { MediaGallery } from "../MediaGallery";
import { Eye, Edit2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RichTextFieldProps {
  field: Field;
  value: Record<string, any> | null;
  onChange: (value: Record<string, any>) => void;
  error?: string;
  disabled?: boolean;
}

import { MenuBar } from "./richtext/MenuBar";

export default function RichTextField({
  field,
  value,
  onChange,
  error,
  disabled,
}: RichTextFieldProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <FieldLayout field={field} error={error}>
        <div
          className={`border rounded-lg bg-[var(--kyro-bg)] overflow-hidden border-[var(--kyro-border)] flex flex-col shadow-sm transition-all duration-200
          ${error ? "border-[var(--kyro-error)] shadow-[0_0_0_1px_var(--kyro-error)]" : "border-[var(--kyro-border)]"}
          ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-bg-secondary)] rounded-t-lg h-[40px]"></div>
          <div className="overflow-y-auto min-h-[160px] max-h-[400px] p-4"></div>
        </div>
      </FieldLayout>
    );
  }

  return (
    <RichTextEditor
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  );
}

function RichTextEditor({
  field,
  value,
  onChange,
  error,
  disabled,
}: RichTextFieldProps) {
    const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelWidth, setPanelWidth] = useState(0);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      setPanelWidth(0);
      return;
    }

    const panel = document.querySelector('[data-kyro-slide-panel="true"]');

    const updateWidth = () => {
      if (panel) {
        setPanelWidth(panel.getBoundingClientRect().width);
      } else {
        setPanelWidth(0);
      }
    };

    updateWidth();

    const observer = new MutationObserver(() => {
      updateWidth();
    });
    if (panel) {
      observer.observe(panel);
    }

    window.addEventListener("resize", updateWidth);
    const interval = setInterval(updateWidth, 100);

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener("resize", updateWidth);
      clearInterval(interval);
    };
  }, [isExpanded]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {},
        link: false,
        underline: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextStyle,
      Color,
    ],
    content: Array.isArray(value) ? { type: "doc", content: value } : (value || { type: "doc", content: [] }),
    editable: !disabled,
    onUpdate: ({ editor }: { editor: any }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert focus:outline-none min-h-[160px] p-4 max-w-none kyro-richtext text-[0.875rem] leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor && value && JSON.stringify(value) !== JSON.stringify(editor.getJSON())) {
      editor.commands.setContent(Array.isArray(value) ? { type: "doc", content: value } : value);
    }
  }, [value, editor]);

  return (
    <FieldLayout field={field} error={error}>
      {isExpanded ? (
        // Maximize mode placeholder inside form
        <div className="border rounded-lg bg-[var(--kyro-bg-secondary)] border-[var(--kyro-border)] p-4 text-center text-xs text-[var(--kyro-text-muted)] flex items-center justify-center gap-3 h-20 transition-all duration-200 shadow-inner">
          <span className="font-medium">
            Rich text editor workspace is currently maximized.
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="px-2.5 py-1 bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)] text-xs rounded-md shadow-sm font-medium hover:scale-102 active:scale-98 transition-transform cursor-pointer"
          >
            Minimize Workspace
          </button>
        </div>
      ) : (
        // Standard inline editor
        <div
          className={`border rounded-lg bg-[var(--kyro-bg)] overflow-hidden border-[var(--kyro-border)] flex flex-col shadow-sm transition-all duration-200
          ${error ? "border-[var(--kyro-error)] shadow-[0_0_0_1px_var(--kyro-error)]" : "border-[var(--kyro-border)] focus-within:border-[var(--kyro-primary)] focus-within:ring-1 focus-within:ring-[var(--kyro-primary)]"}
          ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <MenuBar
            editor={editor}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            onOpenMediaPicker={() => setIsMediaPickerOpen(true)}
            isAiLoading={isAiLoading}
            setIsAiLoading={setIsAiLoading}
          />
          <div className={`overflow-y-auto min-h-[160px] max-h-[400px] transition-all duration-300 ${isAiLoading ? 'opacity-40 pointer-events-none' : ''} relative`}>
            {isAiLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 font-medium text-sm text-[var(--kyro-primary)]">
                <Sparkles size={16} className="animate-pulse mr-2" /> Generating content...
              </div>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      )}

      {/* Portal absolute fullscreen overlay directly inside document.body */}
      {isExpanded &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: "16px",
              bottom: "16px",
              left: "16px",
              right: panelWidth > 0 ? `${panelWidth + 16}px` : "16px",
              zIndex: 9999,
            }}
            className="flex flex-col bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all duration-300"
          >
            <MenuBar
              editor={editor}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
              onOpenMediaPicker={() => setIsMediaPickerOpen(true)}
              isAiLoading={isAiLoading}
              setIsAiLoading={setIsAiLoading}
            />
            <div className={`flex-1 overflow-y-auto transition-all duration-300 ${isAiLoading ? 'opacity-40 pointer-events-none' : ''} relative`}>
              {isAiLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 font-medium text-lg text-[var(--kyro-primary)]">
                  <Sparkles size={24} className="animate-pulse mr-3" /> Generating content...
                </div>
              )}
              <EditorContent editor={editor} className="h-full" />
            </div>
          </div>,
          document.body
        )}

      <style>{`
        .kyro-richtext ul[data-type="taskList"] {
          list-style: none !important;
          padding: 0 !important;
          margin: 0.5rem 0 !important;
        }
        .kyro-richtext li[data-type="taskItem"] {
          display: flex !important;
          align-items: flex-start !important;
          gap: 0.5rem !important;
          margin-bottom: 0.25rem !important;
        }
        .kyro-richtext li[data-type="taskItem"] > label {
          margin-top: 0.25rem !important;
          user-select: none !important;
          cursor: pointer !important;
        }
        .kyro-richtext li[data-type="taskItem"] > div {
          flex: 1 !important;
        }
        .kyro-richtext mark {
          background-color: #fef08a !important;
          border-radius: 0.25rem !important;
          padding: 0.125rem 0.25rem !important;
          color: #1e293b !important;
        }
        .kyro-richtext pre {
          background-color: var(--kyro-bg-secondary, #1e1e3f) !important;
          color: var(--kyro-text, #f8f8f2) !important;
          padding: 1rem !important;
          border-radius: 0.375rem !important;
          border: 1px solid var(--kyro-border) !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          overflow-x: auto !important;
          margin: 1rem 0 !important;
        }
        .kyro-richtext pre code {
          background: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          font-size: 0.85rem !important;
        }
        .kyro-richtext h1 { font-size: 2em !important; font-weight: 700 !important; margin: 0 0 0.75rem !important; line-height: 1.2 !important; }
        .kyro-richtext h2 { font-size: 1.5em !important; font-weight: 600 !important; margin: 0 0 0.75rem !important; line-height: 1.2 !important; }
        .kyro-richtext h3 { font-size: 1.17em !important; font-weight: 600 !important; margin: 0 0 0.75rem !important; line-height: 1.2 !important; }
        .kyro-richtext h4 { font-size: 1em !important; font-weight: 600 !important; margin: 0 0 0.75rem !important; line-height: 1.2 !important; }
        .kyro-richtext ul, .kyro-richtext ol {
          padding-left: 1.5rem !important;
        }
        .kyro-richtext blockquote {
          border-left: 4px solid rgba(148, 163, 184, 0.5) !important;
          margin-left: 0 !important;
          padding-left: 1rem !important;
          font-style: italic !important;
        }

      `}</style>

      {/* Media Picker Modal */}
      {isMediaPickerOpen && (
        <SlidePanel
          open={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          title={t("tooltips.selectImage", { defaultValue: "Select Image" })}
          width="xl"
        >
    <MediaGallery
      pickerMode
      multiple={false}
      onSelect={(selectedItems) => {
              if (selectedItems && selectedItems.length > 0) {
                const selectedImage = selectedItems[0];
                editor
                  .chain()
                  .focus()
                  .setImage({
                    src: selectedImage.url,
                    alt: selectedImage.alt || selectedImage.title || "",
                    title: selectedImage.title || "",
                  })
                  .run();
              }
              setIsMediaPickerOpen(false);
            }}
          />
        </SlidePanel>
      )}
    </FieldLayout>
  );
}
