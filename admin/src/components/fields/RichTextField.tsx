import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
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
import { PromptModal } from "../ui/PromptModal";
import { MediaGallery } from "../MediaGallery";
import { useAutoFormStore } from "../../lib/autoform-store";
import { projectConfig } from "virtual:kyro-plugins";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Terminal,
  Minus,
  Underline as UnderlineIcon,
  Highlighter,
  Palette,
  CheckSquare,
  Eye,
  Edit2,
  Maximize2,
  Minimize2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../ui/Toast";

interface RichTextFieldProps {
  field: Field;
  value: Record<string, any> | null;
  onChange: (value: Record<string, any>) => void;
  error?: string;
  disabled?: boolean;
}

const PRESET_COLORS = [
  { name: "Default", value: "inherit" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#64748b" },
];

const MenuBar = ({
  editor,
  isExpanded,
  setIsExpanded,
  onOpenMediaPicker,
  isAiLoading,
  setIsAiLoading,
}: {
  editor: any;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onOpenMediaPicker: () => void;
  isAiLoading: boolean;
  setIsAiLoading: (loading: boolean) => void;
}) => {
    const { t } = useTranslation();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  
  const formData = useAutoFormStore((state) => state.formData);
  const setField = useAutoFormStore((state) => state.setField);
  
  const isAiAssistantEnabled = projectConfig?.plugins?.some?.(
    (p: any) => p.name === "ai-assistant"
  ) ?? false;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    onOpenMediaPicker();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const selectColor = (colorVal: string) => {
    if (colorVal === "inherit") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(colorVal).run();
    }
    setActiveDropdown(null);
  };

  const handleAiAction = async (action: string, customPrompt?: string) => {
    setActiveDropdown(null);
    
    const titleValue = (document.querySelector('input#title, input[name="title"]') as HTMLInputElement)?.value;
    const title = formData?.title || titleValue || "Untitled Document";
    
    let collectionName = "document";
    try {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts[0] === "admin" && pathParts.length >= 2) {
        collectionName = pathParts[1];
        if (collectionName.endsWith('s')) collectionName = collectionName.slice(0, -1);
      }
    } catch(e) {}

    const context = editor.state.doc.textBetween(
      Math.max(0, editor.state.selection.from - 500),
      Math.min(editor.state.doc.content.size, editor.state.selection.to + 500),
      ' '
    );
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      ' '
    );

    let prompt = "";
    if (action === "Generate") {
      prompt = `Write a comprehensive, engaging, and professional ${collectionName} titled "${title}". 
The content MUST be full-featured and highly formatted. You MUST include:
1. Proper Markdown formatting (headings, paragraphs, bold/italic text, blockquotes)
2. Relevant and context-specific images. You MUST use EXACT Markdown image syntax like this: '![alt text](https://image.pollinations.ai/prompt/URL_ENCODED_KEYWORDS)' (replace URL_ENCODED_KEYWORDS with descriptive keywords for the image)
3. Hyperlinks where necessary to provide additional context or references
4. Well-structured sections with bullet points or numbered lists where appropriate.`;
    } else if (action === "Summarize") {
      prompt = `Summarize the following content from the ${collectionName} titled "${title}" into a concise paragraph. Use clear Markdown formatting if necessary (like bolding key terms): ${selectedText || context}`;
    } else if (action === "Expand") {
      prompt = `Expand on the following content from the ${collectionName} titled "${title}". Add more details, context, and depth. 
Please format the output using rich Markdown (headings, paragraphs, lists). 
If visual context would be helpful, include relevant images using EXACT Markdown image syntax: '![alt text](https://image.pollinations.ai/prompt/URL_ENCODED_KEYWORDS)'.
Here is the content to expand: ${selectedText || context}`;
    } else if (action === "Prompt") {
      if (customPrompt) {
        prompt = `${customPrompt}\n\nPlease format your response using rich Markdown. If your response includes images, use EXACT Markdown image syntax: '![alt text](https://image.pollinations.ai/prompt/URL_ENCODED_KEYWORDS)'`;
      } else {
        setIsPromptModalOpen(true);
        return;
      }
    }

    setIsAiLoading(true);
    try {
      const apiPath = (window as any).__KYRO_API_PATH__ || '/api';
      const res = await fetch(`${apiPath}/kyro/ai/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt, context: selectedText || context })
      });
      if (!res.ok) throw new Error("Failed to get AI response");
      
      const data = await res.json();
      const generatedText = data.text;

      if (generatedText) {
        console.log("[AI Client] Raw Markdown Response:", generatedText);
        const htmlContent = await marked.parse(generatedText);
        console.log("[AI Client] Parsed HTML Response:", htmlContent);
        if (selectedText && action !== "Generate") {
          editor.chain().focus().insertContent(htmlContent).run();
        } else {
          editor.chain().focus().insertContent(htmlContent).run();
        }

        // Automatically generate excerpt and push to excerpt field if it exists
        const excerptInput = document.querySelector('input[name="excerpt"], textarea[name="excerpt"]');
        if (excerptInput || 'excerpt' in formData) {
          const cleanText = generatedText.replace(/<[^>]*>?/gm, '').replace(/[#*]/g, '');
          const excerptMatch = cleanText.match(/^.*?[.!?](?:\s|$)/);
          let excerpt = excerptMatch ? excerptMatch[0].trim() : cleanText.substring(0, 150) + "...";
          if (excerpt.length > 200) {
              excerpt = excerpt.substring(0, 150) + "...";
          }
          setField('excerpt', excerpt);
          addToast('success', "Content generated and excerpt updated.");
        } else {
          addToast('success', "Content generated.");
        }
      }
    } catch (err) {
      console.error("AI Assistant Error:", err);
      addToast('error', "AI Assistant failed to generate text.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const getHeadingLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("heading", { level: 4 })) return "Heading 4";
    return "Normal Text";
  };

  const getAlignIcon = () => {
    if (editor.isActive({ textAlign: "center" })) return <AlignCenter size={12} />;
    if (editor.isActive({ textAlign: "right" })) return <AlignRight size={12} />;
    return <AlignLeft size={12} />;
  };

  const getListIcon = () => {
    if (editor.isActive("orderedList")) return <ListOrdered size={12} />;
    if (editor.isActive("taskList")) return <CheckSquare size={12} />;
    return <List size={12} />;
  };

  const getBlockIcon = () => {
    if (editor.isActive("codeBlock")) return <Terminal size={12} />;
    return <Quote size={12} />;
  };

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1 rounded flex items-center justify-center transition-all duration-150 relative
        ${isActive ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)] shadow-xs scale-95" : "text-[var(--kyro-text)] hover:bg-[var(--kyro-bg-hover)]"}
        ${disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer active:scale-90"}`}
    >
      {children}
    </button>
  );

  const DropdownTrigger = ({ onClick, isActive, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded flex items-center gap-1 transition-all duration-150 text-xs border border-transparent hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] active:scale-98
        ${isActive ? "bg-[var(--kyro-bg-hover)] border-[var(--kyro-border)]" : ""}`}
    >
      {children}
      <ChevronDown size={10} className="opacity-60" />
    </button>
  );

  return (
    <div
      ref={menuBarRef}
      className="flex flex-wrap items-center gap-1.5 p-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-bg-secondary)] rounded-t-lg select-none"
    >
      {/* Group 1: History Actions */}
      <div className="flex items-center gap-0.5 p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title={t("tooltips.undoCtrlz", { defaultValue: "Undo (Ctrl+Z)" })}
        >
          <Undo size={12} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title={t("tooltips.redoCtrly", { defaultValue: "Redo (Ctrl+Y)" })}
        >
          <Redo size={12} />
        </ToolbarButton>
      </div>

      {/* Group 2: Inline Styles */}
      <div className="flex items-center gap-0.5 p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title={t("tooltips.boldCtrlb", { defaultValue: "Bold (Ctrl+B)" })}
        >
          <Bold size={12} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title={t("tooltips.italicCtrli", { defaultValue: "Italic (Ctrl+I)" })}
        >
          <Italic size={12} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title={t("tooltips.underlineCtrlu", { defaultValue: "Underline (Ctrl+U)" })}
        >
          <UnderlineIcon size={12} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title={t("tooltips.strikethrough", { defaultValue: "Strikethrough" })}
        >
          <Strikethrough size={12} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title={t("tooltips.inlineCode", { defaultValue: "Inline Code" })}
        >
          <Code size={12} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
          title={t("tooltips.highlightText", { defaultValue: "Highlight Text" })}
        >
          <Highlighter size={12} />
        </ToolbarButton>

        {/* Text Color Picker Dropdown */}
        <div className="relative flex items-center justify-center">
          <ToolbarButton
            onClick={() => toggleDropdown("color")}
            title={t("tooltips.textColor", { defaultValue: "Text Color" })}
            isActive={activeDropdown === "color" || editor.isActive("textStyle")}
          >
            <Palette size={12} />
          </ToolbarButton>
          {activeDropdown === "color" && (
            <div className="absolute top-full left-0 mt-1.5 p-2 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 flex flex-wrap gap-1 w-44 animate-in fade-in slide-in-from-top-1 duration-150">
              {PRESET_COLORS.map((col) => (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => selectColor(col.value)}
                  title={col.name}
                  className="w-6 h-6 rounded-full border border-[var(--kyro-border)] transition-transform hover:scale-115 active:scale-95 cursor-pointer relative"
                  style={{
                    backgroundColor: col.value === "inherit" ? "transparent" : col.value,
                  }}
                >
                  {col.value === "inherit" && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--kyro-text)] font-semibold">
                      ∅
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Group 3: Headings hierarchy Dropdown */}
      <div className="relative flex items-center p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs">
        <DropdownTrigger
          onClick={() => toggleDropdown("heading")}
          isActive={activeDropdown === "heading"}
          title={t("tooltips.headingHierarchy", { defaultValue: "Heading hierarchy" })}
        >
          <span className="font-medium text-[11px] leading-none min-w-[70px] text-left">
            {getHeadingLabel()}
          </span>
        </DropdownTrigger>
        {activeDropdown === "heading" && (
          <div className="absolute top-full left-0 mt-1.5 p-1 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 min-w-36 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] transition-colors
                ${!editor.isActive("heading") ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              Normal Text
            </button>
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level }).run();
                  setActiveDropdown(null);
                }}
                className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] transition-colors
                  ${editor.isActive("heading", { level }) ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
              >
                Heading {level}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Group 4: List Types Dropdown */}
      <div className="relative flex items-center p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs">
        <DropdownTrigger
          onClick={() => toggleDropdown("lists")}
          isActive={activeDropdown === "lists"}
          title={t("tooltips.listTypes", { defaultValue: "List Types" })}
        >
          {getListIcon()}
        </DropdownTrigger>
        {activeDropdown === "lists" && (
          <div className="absolute top-full left-0 mt-1.5 p-1 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 min-w-36 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive("bulletList") ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <List size={12} />
              Bullet List
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive("orderedList") ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <ListOrdered size={12} />
              Ordered List
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleTaskList().run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive("taskList") ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <CheckSquare size={12} />
              Task Checklist
            </button>
          </div>
        )}
      </div>

      {/* Group 5: Blocks Dropdown */}
      <div className="relative flex items-center p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs">
        <DropdownTrigger
          onClick={() => toggleDropdown("blocks")}
          isActive={activeDropdown === "blocks"}
          title={t("tooltips.structuralBlocks", { defaultValue: "Structural Blocks" })}
        >
          {getBlockIcon()}
        </DropdownTrigger>
        {activeDropdown === "blocks" && (
          <div className="absolute top-full left-0 mt-1.5 p-1 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 min-w-36 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleBlockquote().run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive("blockquote") ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <Quote size={12} />
              Blockquote
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleCodeBlock().run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive("codeBlock") ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <Terminal size={12} />
              Code Block
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setHorizontalRule().run();
                setActiveDropdown(null);
              }}
              className="px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors"
            >
              <Minus size={12} />
              Horizontal Rule
            </button>
          </div>
        )}
      </div>

      {/* Group 6: Text Alignments Dropdown */}
      <div className="relative flex items-center p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs">
        <DropdownTrigger
          onClick={() => toggleDropdown("align")}
          isActive={activeDropdown === "align"}
          title={t("tooltips.alignment", { defaultValue: "Alignment" })}
        >
          {getAlignIcon()}
        </DropdownTrigger>
        {activeDropdown === "align" && (
          <div className="absolute top-full left-0 mt-1.5 p-1 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 min-w-32 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setTextAlign("left").run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive({ textAlign: "left" }) ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <AlignLeft size={12} />
              Align Left
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setTextAlign("center").run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive({ textAlign: "center" }) ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <AlignCenter size={12} />
              Align Center
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setTextAlign("right").run();
                setActiveDropdown(null);
              }}
              className={`px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] flex items-center gap-2 transition-colors
                ${editor.isActive({ textAlign: "right" }) ? "font-semibold text-[var(--kyro-primary)] bg-[var(--kyro-bg-hover)]" : ""}`}
            >
              <AlignRight size={12} />
              Align Right
            </button>
          </div>
        )}
      </div>

      {/* Group 7: Rich Media Embeds */}
      <div className="flex items-center gap-0.5 p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs">
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive("link")}
          title={t("tooltips.link", { defaultValue: "Link" })}
        >
          <LinkIcon size={12} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title={t("tooltips.addImage", { defaultValue: "Add Image" })}>
          <ImageIcon size={12} />
        </ToolbarButton>
      </div>

      {/* Group 8: Workspace Controls */}
      <div className="flex items-center gap-0.5 p-0.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md shadow-xs ml-auto">
        {isAiAssistantEnabled && (
          <div className="relative flex items-center justify-center">
            <ToolbarButton
            onClick={() => toggleDropdown("ai")}
            title={t("tooltips.aiAssistant", { defaultValue: "AI Assistant" })}
            isActive={activeDropdown === "ai"}
            disabled={isAiLoading}
          >
            {isAiLoading ? (
              <Sparkles size={14} className="animate-pulse text-[var(--kyro-primary)]" />
            ) : activeDropdown === "ai" ? (
              <Sparkles size={14} className="text-[var(--kyro-primary)]" />
            ) : (
              <>
                <img src="/logo.svg" alt="Kyro AI" className="w-3.5 h-3.5 object-contain opacity-80 group-hover:opacity-100 block dark:hidden" />
                <img src="/logo-white.svg" alt="Kyro AI" className="w-3.5 h-3.5 object-contain opacity-80 group-hover:opacity-100 hidden dark:block" />
              </>
            )}
          </ToolbarButton>
          {activeDropdown === "ai" && (
            <div className="absolute top-full right-0 mt-1.5 p-1 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 min-w-32 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                type="button"
                onClick={() => handleAiAction("Generate")}
                className="px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] transition-colors flex items-center gap-2"
              >
                <Sparkles size={12} className="text-[var(--kyro-primary)]" /> Generate
              </button>
              <button
                type="button"
                onClick={() => handleAiAction("Summarize")}
                className="px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] transition-colors flex items-center gap-2"
              >
                <AlignLeft size={12} /> Summarize
              </button>
              <button
                type="button"
                onClick={() => handleAiAction("Expand")}
                className="px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] transition-colors flex items-center gap-2"
              >
                <Maximize2 size={12} /> Expand
              </button>
              <button
                type="button"
                onClick={() => handleAiAction("Prompt")}
                className="px-2.5 py-1.5 text-xs text-left rounded-md hover:bg-[var(--kyro-bg-hover)] cursor-pointer text-[var(--kyro-text)] transition-colors flex items-center gap-2 border-t border-[var(--kyro-border)] mt-0.5"
              >
                <Terminal size={12} /> Prompt
              </button>
            </div>
          )}
        </div>
        )}
        <ToolbarButton
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Workspace" : "Enlarge Workspace"}
        >
          {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </ToolbarButton>
      </div>

      <PromptModal
        open={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSubmit={(prompt) => {
          setIsPromptModalOpen(false);
          handleAiAction("Prompt", prompt);
        }}
        title="AI Assistant Prompt"
        placeholder="What do you want the AI to do?"
        defaultValue={editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') ? "Rewrite this text to be more engaging." : "Write a paragraph about..."}
      />
    </div>
  );
};

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
