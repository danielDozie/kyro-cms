import logoAccentUrl from "../../assets/logo-accent.svg?url";
import React, {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { CollectionConfig } from "@kyro-cms/core/client";
import {
  defaultStudioRegistry,
  getStudioComponents,
  getStudioIssues,
  subscribeStudioComponents,
  type StudioBlock,
} from "@kyro-cms/studio";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Layers,
  Check,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  PanelLeft,
  PanelRight,
  X,
  Settings2,
  Search,
  Copy,
  Eye,
  MousePointer2,
} from "lucide-react";
import { useAutoFormStore } from "../../lib/autoform-store";
import {
  defaultsFromStudioSchema,
  flattenStudioTree,
  getStudioBlockField,
  getStudioNodeSchema,
  getStudioValue,
  identifyStudioBlocks,
  mergeStudioDefaults,
  moveStudioTreeNode,
  omitStudioCompositionFields,
  reorderStudioBlocks,
  replaceStudioSiblings,
  setStudioValue,
  studioCollectionUrl,
  studioDocumentTitle,
} from "../../lib/studio";
import { clampStudioPanelWidth, defaultStudioPanels, parseStudioPanelPreferences } from "../../lib/studio-panels";
import { adminPath } from "../../lib/paths";
import { setChangeSource } from "../../lib/change-source";
import { confirmEditorSwitch } from "../../lib/editor-switch";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
import { useUIStore } from "../../lib/stores";
import StudioProperties from "./StudioProperties";
import { StudioAppearance, useWorkspaceAppearance } from "./StudioAppearance";
import { useStudioReferences } from "./useStudioReferences";
import { getStudioInsertIcon } from "./insert-icons";
const StudioFrame = lazy(() => import("./StudioFrame"));
const canvasViewports = [
  { id: "desktop", Icon: Monitor, label: "Desktop" },
  { id: "tablet", Icon: Tablet, label: "Tablet" },
  { id: "mobile", Icon: Smartphone, label: "Mobile" },
] as const;

interface Props {
  config: CollectionConfig;
  collectionSlug: string;
  documentId?: string;
  disabled?: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  documentStatus: string;
  hasUnpublishedChanges: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  contentView?: ReactNode;
  historyView?: ReactNode;
}
export default function StudioEditor({
  config,
  collectionSlug,
  documentId,
  disabled,
  saveStatus,
  documentStatus,
  hasUnpublishedChanges,
  onSaveDraft,
  onPublish,
  contentView,
  historyView,
}: Props) {
  const { formData, hasUnsavedChanges, autoSaveStatus } = useAutoFormStore();
  const { confirm } = useUIStore();
  useSyncExternalStore(subscribeStudioComponents, getStudioComponents, getStudioComponents);
  const composition = getStudioBlockField(config)!;
  const raw = getStudioValue(formData, composition.path);
  const blocks: StudioBlock[] = Array.isArray(raw) ? raw : [];
  const [selected, setSelected] = useState<string>();
  const [selectedField, setSelectedField] = useState<string>();
  const [viewport, setViewport] = useState<(typeof canvasViewports)[number]["id"]>("desktop");
  const viewportTrigger = useRef<HTMLButtonElement>(null);
  const { Icon: ViewportIcon, label: viewportLabel } =
    canvasViewports.find(({ id }) => id === viewport) ?? canvasViewports[0];
  const [tab, setTab] = useState<"layers" | "insert">("layers");
  const [inspector, setInspector] = useState<"section" | "page">("section");
  const [mode, setMode] = useState("design");
  const [interactive, setInteractive] = useState(false);
  const [panelState, setPanelState] = useState(() => {
    try {
      return parseStudioPanelPreferences(localStorage.getItem("kyro-studio-panels-v1"));
    } catch {
      return { ...defaultStudioPanels };
    }
  });
  const [search, setSearch] = useState("");
  const [checks, setChecks] = useState(false);
  const [, refresh] = useState(0);
  const history = useRef<{ past: StudioBlock[][]; future: StudioBlock[][] }>({ past: [], future: [] });
  const inspectorRef = useRef<HTMLDivElement>(null);
  const draggedPath = useRef<string | undefined>(undefined);
  const resizing = useRef<{ side: "library" | "inspector"; x: number; width: number } | null>(null);
  const tree = flattenStudioTree(blocks);
  const node = tree.find((n) => n.path === selected);
  const block = node?.block;
  const schema = selected ? getStudioNodeSchema(composition.field.blocks, blocks, selected) : undefined;
  const renderer = block ? defaultStudioRegistry.get(block.blockType) : undefined;
  const appearance = useWorkspaceAppearance();
  const context = useStudioReferences(blocks);
  const issues = getStudioIssues(blocks, context);
  const isSaving = saveStatus === "saving" || autoSaveStatus === "saving";
  const locked =
    disabled || isSaving || (composition.field as any).readOnly === true || composition.field.admin?.readOnly === true;
  const pageFields = useMemo(
    () => omitStudioCompositionFields(config.fields, composition.path),
    [config, composition.path],
  );
  const settingsFields = useMemo(
    () => omitStudioCompositionFields(pageFields, "slug").flatMap((field) => {
      if (field.type !== "tabs") return [field];
      const tabs = field.tabs.filter((tab: { label?: string }) => tab.label !== "Content");
      return tabs.length ? [{ ...field, tabs }] : [];
    }),
    [pageFields],
  );
  const target = renderer?.allowedChildren && node ? `${node.path}.children` : node?.parent || "";
  const targetParentPath = target.replace(/\.(children|elements)$/, "");
  const targetParent = target ? tree.find((n) => n.path === targetParentPath) : undefined;
  const targetKind = target.endsWith(".elements") ? "elements" : "children";
  const targetSchemas = targetParent
    ? getStudioNodeSchema(composition.field.blocks, blocks, targetParent.path)?.fields.find(
        (f: any) => f.name === targetKind,
      )?.blocks || []
    : composition.field.blocks;
  const available = targetSchemas.filter(
    (b: any) =>
      defaultStudioRegistry.has(b.slug) &&
      (!targetParent ||
        targetKind === "elements" ||
        defaultStudioRegistry.get(targetParent.block.blockType)?.allowedChildren?.includes(b.slug)),
  );
  const groups = new Map<string, any[]>();
  available
    .filter((block: any) => block.slug !== "text")
    .filter((b: any) =>
      `${b.label} ${b.slug} ${b.admin?.description || ""}`.toLowerCase().includes(search.toLowerCase()),
    )
    .forEach((b: any) => {
      const category = defaultStudioRegistry.get(b.slug)?.category || b.admin?.group || "Components";
      groups.set(category, [...(groups.get(category) || []), b]);
    });
  const title = studioDocumentTitle(config, formData);
  useEffect(() => {
    try {
      localStorage.setItem("kyro-studio-panels-v1", JSON.stringify(panelState));
    } catch {}
  }, [panelState]);
  const resizeHandle = (side: "library" | "inspector") => {
    const width = panelState[`${side}Width`];
    const min = side === "library" ? 168 : 240;
    const max = side === "library" ? 420 : 520;
    const update = (value: number) =>
      setPanelState((state) => ({ ...state, [`${side}Width`]: clampStudioPanelWidth(side, value) }));
    return (
      <div
        className={`visual-studio-resizer visual-studio-resizer-${side}`}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${side === "library" ? "component library" : "inspector"}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={width}
        tabIndex={0}
        title="Drag to resize. Double-click to reset. Arrow keys also resize."
        onDoubleClick={() => update(defaultStudioPanels[`${side}Width`])}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          resizing.current = { side, x: event.clientX, width };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const active = resizing.current;
          if (!active || active.side !== side) return;
          const delta = (event.clientX - active.x) * (side === "library" ? 1 : -1);
          update(active.width + delta);
        }}
        onPointerUp={(event) => {
          resizing.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onLostPointerCapture={() => {
          resizing.current = null;
        }}
        onKeyDown={(event) => {
          const delta = side === "library" ? 1 : -1;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            update(width + (event.key === "ArrowRight" ? delta : -delta) * (event.shiftKey ? 32 : 8));
          } else if (event.key === "Home") {
            event.preventDefault();
            update(min);
          } else if (event.key === "End") {
            event.preventDefault();
            update(max);
          }
        }}
      />
    );
  };

  useEffect(() => {
    history.current = { past: [], future: [] };
    setSelected(undefined);
    setSelectedField(undefined);
    refresh((n) => n + 1);
  }, [collectionSlug, documentId]);
  const write = (next: StudioBlock[]) => {
    const state = useAutoFormStore.getState();
    const identified = identifyStudioBlocks(next, () => crypto.randomUUID());
    const data = setStudioValue(state.formData, composition.path, identified);
    const top = composition.path.split(".")[0];
    setChangeSource("keystroke");
    state.setField(top, data[top]);
    return identified;
  };
  const commit = (next: StudioBlock[]) => {
    if (locked || next === blocks) return;
    history.current.past = [...history.current.past.slice(-49), structuredClone(blocks)];
    history.current.future = [];
    write(next);
    refresh((n) => n + 1);
  };
  const undo = () => {
    if (locked) return;
    const previous = history.current.past.pop();
    if (previous) {
      history.current.future.push(structuredClone(blocks));
      write(previous);
      setSelected(undefined);
      refresh((n) => n + 1);
    }
  };
  const redo = () => {
    if (locked) return;
    const next = history.current.future.pop();
    if (next) {
      history.current.past.push(structuredClone(blocks));
      write(next);
      setSelected(undefined);
      refresh((n) => n + 1);
    }
  };
  const select = (path: string, field?: string) => {
    setSelected(path);
    setSelectedField(field);
    setInspector("section");
    setPanelState((state) => ({ ...state, inspectorOpen: true }));
  };
  useEffect(() => {
    if (!selectedField) return;
    const root = inspectorRef.current;
    const exact = root?.querySelector<HTMLElement>(`[data-studio-property="${CSS.escape(selectedField)}"]`);
    const owner =
      exact ||
      [...(root?.querySelectorAll<HTMLElement>("[data-studio-property]") || [])].find((e) =>
        selectedField.startsWith(`${e.dataset.studioProperty}.`),
      );
    owner
      ?.querySelector<HTMLElement>("input:not([disabled]),textarea:not([disabled]),button:not([disabled])")
      ?.focus({ preventScroll: true });
    owner?.scrollIntoView({ block: "nearest" });
  }, [selected, selectedField]);
  const create = (type: string, schemas: any[] = targetSchemas): StudioBlock => {
    const definition = defaultStudioRegistry.get(type)!;
    const schema = schemas.find((s: any) => s.slug === type);
    const result = {
      ...mergeStudioDefaults(defaultsFromStudioSchema(schema?.fields || []), definition.defaults || {}),
      id: crypto.randomUUID(),
      blockType: type,
    } as StudioBlock;
    const childSchemas = schema?.fields?.find((f: any) => f.name === "children")?.blocks || [];
    if (type === "row" || type === "grid")
      result.children = [create("column", childSchemas), create("column", childSchemas)];
    if (type === "section") result.children = [create("container", childSchemas)];
    return result;
  };
  const insert = (type: string) => {
    if (locked || !available.some((s: any) => s.slug === type)) return;
    const siblings = target ? getStudioValue(blocks, target) || [] : blocks;
    commit(replaceStudioSiblings(blocks, target, [...siblings, create(type)]));
    setSelected(target ? `${target}.${siblings.length}` : String(siblings.length));
    setSelectedField(undefined);
    setTab("layers");
    setInspector("section");
  };
  const updateBlock = (path: string, value: unknown) => {
    if (node) commit(setStudioValue(blocks, `${node.path}.${path}`, value));
  };
  const pageChange = (path: string, value: unknown) => {
    if (locked) return;
    const state = useAutoFormStore.getState();
    const data = setStudioValue(state.formData, path, value);
    const top = path.split(".")[0];
    setChangeSource("keystroke");
    state.setField(top, data[top]);
  };
  const move = (direction: number) => {
    if (!node) return;
    const siblings = node.parent ? getStudioValue(blocks, node.parent) : blocks;
    const dest = node.index + direction;
    if (dest < 0 || dest >= siblings.length) return;
    commit(replaceStudioSiblings(blocks, node.parent, reorderStudioBlocks(siblings, node.index, dest)));
    setSelected(node.parent ? `${node.parent}.${dest}` : String(dest));
  };
  const duplicate = () => {
    if (!node) return;
    const siblings = node.parent ? getStudioValue(blocks, node.parent) : blocks;
    const copy = structuredClone(node.block);
    const strip = (b: any) => {
      delete b.id;
      for (const key of ["children", "elements"]) b[key]?.forEach(strip);
    };
    strip(copy);
    const next = [...siblings];
    next.splice(node.index + 1, 0, copy);
    commit(replaceStudioSiblings(blocks, node.parent, next));
    setSelected(node.parent ? `${node.parent}.${node.index + 1}` : String(node.index + 1));
  };
  const remove = () => {
    if (!node || locked) return;
    confirm({
      title: "Remove component?",
      message: "This removes the component and its nested content. You can undo this change before leaving Studio.",
      confirmLabel: "Remove component",
      onConfirm: () => {
        const siblings = node.parent ? getStudioValue(blocks, node.parent) : blocks;
        commit(
          replaceStudioSiblings(
            blocks,
            node.parent,
            siblings.filter((_: any, i: number) => i !== node.index),
          ),
        );
        setSelected(undefined);
      },
    });
  };
  const drop = (event: React.DragEvent, path: string) => {
    event.preventDefault();
    const from = tree.find((n) => n.path === draggedPath.current);
    const to = tree.find((n) => n.path === path);
    draggedPath.current = undefined;
    if (locked || !from || !to || from.path === to.path) return;
    const targetDefinition = defaultStudioRegistry.get(to.block.blockType);
    const parent = targetDefinition?.allowedChildren ? `${to.path}.children` : to.parent;
    const owner = parent ? tree.find((n) => n.path === parent.replace(/\.(children|elements)$/, "")) : undefined;
    const allowedSchemas = owner
      ? getStudioNodeSchema(composition.field.blocks, blocks, owner.path)?.fields.find(
          (f: any) => f.name === "children",
        )?.blocks || []
      : composition.field.blocks;
    if (!allowedSchemas.some((s: any) => s.slug === from.block.blockType)) return;
    const moved = moveStudioTreeNode(
      blocks,
      from.path,
      parent,
      targetDefinition?.allowedChildren ? undefined : to.index,
    );
    if (moved.blocks !== blocks) {
      commit(moved.blocks);
      setSelected(moved.path);
    }
  };
  const status =
    autoSaveStatus === "conflict"
      ? "Save conflict"
      : saveStatus === "error" || autoSaveStatus === "error"
        ? "Save failed"
        : isSaving
          ? "Saving…"
          : hasUnsavedChanges
            ? "Unsaved changes"
            : !formData.id
              ? "Not saved yet"
              : hasUnpublishedChanges
                ? "Draft changes saved"
                : documentStatus === "published"
                  ? "Published"
                  : "Draft saved";
  const label = (b: any) => defaultStudioRegistry.get(b.blockType)?.label || b.blockType;
  return (
    <div className="visual-studio">
      <header className="visual-studio-toolbar">
        <div className="visual-studio-identity">
          <a
            href={studioCollectionUrl(adminPath, collectionSlug)}
            className="visual-studio-icon"
            aria-label="Back to Studio pages"
          >
            <ArrowLeft size={16} />
          </a>
          <span className="visual-studio-wordmark"><img src={logoAccentUrl} alt="Kyro CMS" width="26" height="23"/>Studio</span>
          <span className="visual-studio-divider" />
          <strong title={title}>{title}</strong>
        </div>
        <nav className="visual-studio-modes" aria-label="Page editing mode">
          {["design", "content", "settings", "history"].map((m) => (
            <button type="button" key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </nav>
        <div className="visual-studio-actions">
          <StudioAppearance mode={appearance.mode} />
          <span role="status" className="visual-studio-save-state">
            {status}
          </span>
          <button
            type="button"
            className="visual-studio-icon"
            aria-label="Undo canvas change"
            disabled={locked || !history.current.past.length}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="visual-studio-icon"
            aria-label="Redo canvas change"
            disabled={locked || !history.current.future.length}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
          <button
            type="button"
            className="visual-studio-checks"
            aria-expanded={checks}
            onClick={() => setChecks(!checks)}
          >
            {issues.length ? `${issues.length} to resolve` : "Ready"}
          </button>
          <Button size="sm" disabled={locked || (!hasUnsavedChanges && !!formData.id)} onClick={onSaveDraft}>
            Save draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={
              locked ||
              issues.length > 0 ||
              (documentStatus === "published" && !hasUnsavedChanges && !hasUnpublishedChanges)
            }
            onClick={onPublish}
          >
            Publish
          </Button>
        </div>
      </header>
      {autoSaveStatus === "conflict" && (
        <div className="visual-studio-notice" role="alert">
          This page changed elsewhere. Your local changes remain here. Review the latest version before saving again.
        </div>
      )}
      {disabled && <div className="visual-studio-notice">You have read-only access to this page.</div>}
      {checks && (
        <div className="visual-studio-readiness" role="region" aria-label="Publish checks">
          <strong>Publish checks</strong>
          {issues.length ? (
            <ul>
              {issues.map((issue, i) => (
                <li key={`${issue.path}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("design");
                      select(issue.path.replace(/\.(?:form|image|backgroundImage|selectedItems).*$/, ""));
                    }}
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              All current blocks have renderers and required references are resolved. The frontend must use the same
              registered components.
            </p>
          )}
        </div>
      )}
      {mode !== "design" ? (
        <section className="visual-studio-document-view" aria-label={`${mode} workspace`}>
          {mode === "history" ? (
            historyView
          ) : mode === "content" ? (
            contentView
          ) : (
            <StudioProperties
              fields={settingsFields}
              data={formData}
              root={formData}
              disabled={locked}
              onChange={pageChange}
            />
          )}
        </section>
      ) : (
        <>
          <div className="visual-studio-canvas-tools">
            <button
              type="button"
              className="visual-studio-tool visual-studio-panel-toggle"
              title="Toggle component library"
              aria-label="Toggle component library"
              aria-pressed={panelState.libraryOpen}
              onClick={() => setPanelState((state) => ({ ...state, libraryOpen: !state.libraryOpen }))}
            >
              <PanelLeft size={16} />
            </button>
            <Dropdown
              align="left"
              direction="down"
              menuClassName="visual-studio-viewport-menu"
              trigger={
                <button
                  ref={viewportTrigger}
                  type="button"
                  className="visual-studio-tool visual-studio-viewport-trigger"
                  title={`Canvas viewport: ${viewportLabel}`}
                  aria-label={`Canvas viewport: ${viewportLabel}`}
                >
                  <ViewportIcon size={16} aria-hidden="true" />
                  <ChevronDown size={12} aria-hidden="true" />
                </button>
              }
            >
              {canvasViewports.map(({ id, Icon, label }) => (
                <button
                  type="button"
                  key={id}
                  role="menuitemradio"
                  aria-checked={viewport === id}
                  onClick={() => {
                    setViewport(id);
                    viewportTrigger.current?.focus();
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                  {viewport === id && <Check size={14} className="visual-studio-viewport-check" aria-hidden="true" />}
                </button>
              ))}
            </Dropdown>
            <button
              type="button"
              className="visual-studio-tool"
              aria-pressed={interactive}
              onClick={() => setInteractive(!interactive)}
            >
              {interactive ? <Eye size={14} /> : <MousePointer2 size={14} />} {interactive ? "Interact" : "Edit"}
            </button>
            <span>Draft canvas · uses your page’s blocks</span>
            <button
              type="button"
              className="visual-studio-tool visual-studio-panel-toggle visual-studio-inspector-toggle"
              title="Toggle inspector"
              aria-label="Toggle inspector"
              aria-pressed={panelState.inspectorOpen}
              onClick={() => setPanelState((state) => ({ ...state, inspectorOpen: !state.inspectorOpen }))}
            >
              <PanelRight size={16} />
            </button>
          </div>
          <div
            className={`visual-studio-body ${panelState.libraryOpen ? "" : "visual-studio-no-library"} ${panelState.inspectorOpen ? "" : "visual-studio-no-inspector"}`}
            style={
              {
                "--studio-library-width": `${panelState.libraryWidth}px`,
                "--studio-inspector-width": `${panelState.inspectorWidth}px`,
              } as React.CSSProperties
            }
          >
            {panelState.libraryOpen && (
              <>
                <aside className="visual-studio-library" aria-label="Page structure">
                  <div className="visual-studio-panel-tabs">
                    <button type="button" aria-pressed={tab === "layers"} onClick={() => setTab("layers")}>
                      <Layers size={14} />
                      Layers <span>{tree.length}</span>
                    </button>
                    <button type="button" aria-pressed={tab === "insert"} onClick={() => setTab("insert")}>
                      <Plus size={14} />
                      Insert
                    </button>
                    <button
                      type="button"
                      className="visual-studio-panel-close"
                      aria-label="Close component library"
                      onClick={() => setPanelState((state) => ({ ...state, libraryOpen: false }))}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {tab === "layers" ? (
                    <>
                      <button
                        type="button"
                        className="visual-studio-page-root"
                        aria-pressed={!selected}
                        onClick={() => setSelected(undefined)}
                      >
                        Page <span>{blocks.length} sections</span>
                      </button>
                      <ol className="visual-studio-layer-list">
                        {tree.map((n) => (
                          <li
                            key={n.block.id || n.path}
                            draggable={!locked}
                            onDragStart={() => {
                              draggedPath.current = n.path;
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => drop(e, n.path)}
                          >
                            <button
                              type="button"
                              style={{ paddingInlineStart: 8 + n.depth * 14 }}
                              aria-pressed={selected === n.path}
                              onClick={() => select(n.path)}
                            >
                              <span className="visual-studio-layer-number">
                                {defaultStudioRegistry.get(n.block.blockType)?.allowedChildren ? "▱" : "·"}
                              </span>
                              <span>{label(n.block)}</span>
                              {listChildren(n.block) > 0 && <small>{listChildren(n.block)}</small>}
                            </button>
                          </li>
                        ))}
                      </ol>
                      {!tree.length && (
                        <p className="visual-studio-empty-caption">
                          Insert a layout or content component to start building.
                        </p>
                      )}
                      <button
                        type="button"
                        className="visual-studio-add"
                        disabled={locked}
                        onClick={() => {
                          setSearch("");
                          setTab("insert");
                        }}
                      >
                        <Plus size={14} />
                        {renderer?.allowedChildren ? "Add inside" : "Add component"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="visual-studio-insert-target">
                        Insert into <strong>{targetParent ? label(targetParent.block) : "Page"}</strong>
                        {target && (
                          <button type="button" onClick={() => setSelected(undefined)}>
                            Use page root
                          </button>
                        )}
                      </div>
                      <label className="visual-studio-library-search">
                        <Search size={14} />
                        <input
                          type="search"
                          aria-label="Find components"
                          placeholder="Find components…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                      <div className="visual-studio-component-groups">
                        {[...groups]
                          .sort(
                            ([a], [b]) =>
                              ["Layout", "Content", "Media", "Marketing", "Interactive", "Dynamic"].indexOf(a) -
                              ["Layout", "Content", "Media", "Marketing", "Interactive", "Dynamic"].indexOf(b),
                          )
                          .map(([group, items]) => (
                            <section key={group} data-insert-group={group}>
                              <h3>
                                {group} <span>{items.length}</span>
                              </h3>
                              <div className="visual-studio-component-list">
                                {items.map((item) => {
                                  const Icon = getStudioInsertIcon(item.slug);
                                  return (
                                    <button
                                      type="button"
                                      key={item.slug}
                                      disabled={locked}
                                      onClick={() => insert(item.slug)}
                                    >
                                      <span className="kyro-block-picker-icon" aria-hidden="true">
                                        <Icon size={14} />
                                      </span>
                                      <strong>{defaultStudioRegistry.get(item.slug)?.label || item.label}</strong>
                                      <small>{item.admin?.description || `Add ${item.label || item.slug}`}</small>
                                      <Plus className="visual-studio-component-add" size={14} aria-hidden="true" />
                                    </button>
                                  );
                                })}
                              </div>
                            </section>
                          ))}
                        {!groups.size && (
                          <p className="visual-studio-empty-caption">
                            No matching components are allowed in this layout.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <footer>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => confirmEditorSwitch(`${adminPath}/${collectionSlug}/${formData.id || "new"}`, "structured editor", {
                        editingDocument: true,
                        saving: isSaving,
                      })}
                    >
                      Structured editor ↗
                    </button>
                  </footer>
                </aside>
                {resizeHandle("library")}
              </>
            )}
            <section className="visual-studio-stage" aria-label="Page canvas">
              <div className="visual-studio-stage-bar">
                <span>
                  {viewport === "desktop" ? "Responsive canvas" : viewport === "tablet" ? "768 px" : "390 px"}
                </span>
                <span>
                  {interactive ? "Try tabs, accordions, and carousel controls" : "Select any nested component to edit"}
                </span>
              </div>
              <div className="visual-studio-frame-scroll">
                <Suspense fallback={<p className="visual-studio-loading">Loading canvas…</p>}>
                  <StudioFrame
                    blocks={blocks}
                    selectedPath={selected}
                    viewport={viewport}
                    context={context}
                    theme={appearance.theme}
                    interactive={interactive}
                    onSelect={select}
                  />
                </Suspense>
              </div>
              <div className="visual-studio-stage-footer">
                <span>{tree.length} components</span>
                <span>Shared renderer · headless content</span>
              </div>
            </section>
            {panelState.inspectorOpen && (
              <>
                {resizeHandle("inspector")}
                <aside className="visual-studio-inspector" aria-label="Component inspector" ref={inspectorRef}>
                  <div className="visual-studio-panel-tabs">
                    <button
                      type="button"
                      aria-pressed={inspector === "section"}
                      onClick={() => setInspector("section")}
                    >
                      <Settings2 size={14} />
                      Component
                    </button>
                    <button type="button" aria-pressed={inspector === "page"} onClick={() => setInspector("page")}>
                      Page
                    </button>
                    <button
                      type="button"
                      className="visual-studio-panel-close"
                      aria-label="Close inspector"
                      onClick={() => setPanelState((state) => ({ ...state, inspectorOpen: false }))}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {inspector === "page" ? (
                    <div className="visual-studio-inspector-content">
                      <h2>Page details</h2>
                      <StudioProperties
                        fields={pageFields.filter((f: any) => ["title", "slug"].includes(f.name))}
                        data={formData}
                        root={formData}
                        disabled={locked}
                        onChange={pageChange}
                      />
                      <Button size="sm" onClick={() => setMode("settings")}>
                        All page settings
                      </Button>
                    </div>
                  ) : block ? (
                    <>
                      <div className="visual-studio-selection-heading">
                        <div>
                          <span>{selected?.split(".").length === 1 ? "Page section" : "Nested component"}</span>
                          <h2>{label(block)}</h2>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="visual-studio-icon"
                            aria-label="Move component up"
                            disabled={locked || node?.index === 0}
                            onClick={() => move(-1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="visual-studio-icon"
                            aria-label="Move component down"
                            disabled={
                              locked ||
                              !node ||
                              node.index >= (node.parent ? getStudioValue(blocks, node.parent) : blocks).length - 1
                            }
                            onClick={() => move(1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="visual-studio-icon"
                            aria-label="Duplicate component"
                            disabled={locked}
                            onClick={duplicate}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="visual-studio-icon"
                            aria-label="Remove component"
                            disabled={locked}
                            onClick={remove}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {renderer?.allowedChildren && (
                        <button
                          type="button"
                          className="visual-studio-add"
                          onClick={() => {
                            setSearch("");
                            setTab("insert");
                          }}
                          disabled={locked}
                        >
                          <Plus size={14} />
                          Insert inside {label(block)}
                        </button>
                      )}
                      <div className="visual-studio-inspector-content">
                        {schema ? (
                          <StudioProperties
                            fields={schema.fields
                              .filter((f: any) => f.name !== "children")
                              .map((f: any) =>
                                f.name === "layout"
                                  ? {
                                      ...f,
                                      fields: f.fields.filter(
                                        (child: any) => child.name !== "columns" || block.blockType === "grid",
                                      ),
                                    }
                                  : f,
                              )}
                            data={block}
                            root={formData}
                            disabled={locked}
                            selectedPath={selectedField}
                            onChange={updateBlock}
                          />
                        ) : (
                          <p className="visual-studio-empty-caption">
                            The schema is unavailable. This component’s data is preserved.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="visual-studio-inspector-empty">
                      <Settings2 size={24} />
                      <h2>Make it yours.</h2>
                      <p>Select a component on the canvas or in Layers to edit its properties.</p>
                      <Button size="sm" onClick={() => setMode("settings")}>
                        Page settings
                      </Button>
                    </div>
                  )}
                </aside>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function listChildren(block: any) {
  return (
    (Array.isArray(block.children) ? block.children.length : 0) +
    (Array.isArray(block.elements) ? block.elements.length : 0)
  );
}
