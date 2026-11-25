import type { ComponentType, ReactNode } from "react";
export interface StudioBlock extends Record<string, any> {
  id?: string;
  blockType: string;
  children?: StudioBlock[];
  elements?: StudioBlock[];
}
export interface StudioContext {
  registry?: StudioRegistry;
  references?: ReadonlyMap<string, Record<string, any>>;
  renderForm?: (form: Record<string, any>, props: StudioRenderProps) => ReactNode;
}
export interface StudioRenderProps {
  block: StudioBlock;
  editing?: boolean;
  pathPrefix?: string;
  nodePath?: string;
  context?: StudioContext;
}
export interface StudioComponent {
  type: string;
  label: string;
  category?: string;
  description?: string;
  Component: ComponentType<StudioRenderProps>;
  defaults?: Record<string, unknown>;
  editableFields?: string[];
  requiresFormAdapter?: boolean;
  allowedChildren?: string[];
}
export type StudioRegistry = ReadonlyMap<string, StudioComponent>;
export interface StudioIssue {
  code: string;
  path: string;
  message: string;
}
