import type { CollectionConfig } from "../registry/types.js";

export interface StudioBlock extends Record<string, any> {
  id?: string;
  blockType: string;
  children?: StudioBlock[];
  elements?: StudioBlock[];
}

export interface StudioSiteCapabilities {
  enabled?: boolean;
  siteId: string;
  projectId?: string;
  previewOrigin: string;
  rendererRevision: string;
  blockTypes: string[];
  features: {
    forms: boolean;
    liveDrafts: boolean;
  };
}

export interface StudioValidationIssue {
  code:
    | "invalid-nesting"
    | "unknown-block"
    | "max-depth-exceeded"
    | "max-nodes-exceeded"
    | "max-length-exceeded"
    | "prototype-pollution"
    | "invalid-id"
    | "invalid-layout-value"
    | "required-field-missing"
    | "read-only-mutation"
    | "form-adapter-required"
    | "unresolved-reference";
  path: string;
  message: string;
}

export interface StudioValidateOptions {
  isPublish?: boolean;
  studioEnabled?: boolean;
  user?: any;
  req?: any;
  originalDoc?: any;
  maxDepth?: number;
  maxNodes?: number;
}

export type StudioBridgeMessageType =
  | "KYRO_STUDIO_READY"
  | "KYRO_STUDIO_SELECT"
  | "KYRO_STUDIO_DRAFT_UPDATE"
  | "KYRO_STUDIO_SCROLL_INTO_VIEW";

export interface StudioBridgeMessage<T = any> {
  type: StudioBridgeMessageType;
  documentId?: string;
  revision?: string;
  nodePath?: string;
  fieldName?: string;
  blocks?: StudioBlock[];
  origin?: string;
  payload?: T;
}

export type DeliveryStatus =
  | "draft"
  | "published"
  | "delivering"
  | "live"
  | "delivery_failed";

export interface PublishDeliveryRecord {
  id: string;
  collection: string;
  documentId: string;
  revision: string;
  status: DeliveryStatus;
  mode: "ssr" | "ssg";
  targetUrl?: string;
  attempts: number;
  lastAttemptAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
}
