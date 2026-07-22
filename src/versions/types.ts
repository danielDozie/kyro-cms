export type VersionStatus = 'draft' | 'published' | 'archived';

export interface Version<T = Record<string, unknown>> {
  id: string;
  collection: string;
  documentId: string;
  version: number;
  status: VersionStatus;
  data: T;
  createdBy: string;
  createdAt: Date;
  publishedAt?: Date;
  changeDescription?: string;
}

export interface VersionDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface VersionHistoryOptions {
  collection: string;
  documentId: string;
  limit?: number;
  offset?: number;
}

export interface CreateVersionOptions<T = Record<string, unknown>> {
  collection: string;
  documentId: string;
  data: T;
  status?: VersionStatus;
  createdBy: string;
  changeDescription?: string;
}

export interface PublishVersionOptions {
  collection: string;
  documentId: string;
  versionId: string;
  publishedBy: string;
}

export interface CompareVersionsOptions {
  collection: string;
  documentId: string;
  versionA: string | number;
  versionB: string | number;
}

export interface VersionAdapter {
  createVersion<T>(options: CreateVersionOptions<T>): Promise<Version<T>>;
  getVersion<T>(collection: string, versionId: string): Promise<Version<T> | null>;
  getVersions<T>(options: VersionHistoryOptions): Promise<Version<T>[]>;
  getLatestVersion<T>(collection: string, documentId: string): Promise<Version<T> | null>;
  getPublishedVersion<T>(collection: string, documentId: string): Promise<Version<T> | null>;
  publishVersion(options: PublishVersionOptions): Promise<void>;
  revertToVersion<T>(options: { collection: string; documentId: string; versionId: string; userId: string }): Promise<Version<T>>;
  compareVersions<T>(options: CompareVersionsOptions): Promise<VersionDiff[]>;
  deleteVersions(collection: string, documentId: string): Promise<void>;
}

export interface DraftPublishConfig {
  enabled?: boolean;
  draftsEnabled?: boolean;
  publishEnabled?: boolean;
  scheduleEnabled?: boolean;
  versioningEnabled?: boolean;
  maxVersionsPerDocument?: number;
  autoPublish?: boolean;
  requirePublishPermission?: boolean;
}

export interface VersionPublishSchedule {
  versionId: string;
  scheduledFor: Date;
  status: 'pending' | 'published' | 'cancelled';
}

export function getDefaultDraftPublishConfig(): Required<DraftPublishConfig> {
  return {
    enabled: true,
    draftsEnabled: true,
    publishEnabled: true,
    scheduleEnabled: false,
    versioningEnabled: true,
    maxVersionsPerDocument: 50,
    autoPublish: false,
    requirePublishPermission: true
  };
}
