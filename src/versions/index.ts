import { randomUUID } from 'crypto';
import type {
  Version,
  VersionStatus,
  VersionDiff,
  VersionAdapter,
  CreateVersionOptions,
  PublishVersionOptions,
  CompareVersionsOptions,
  VersionHistoryOptions,
  DraftPublishConfig,
  VersionPublishSchedule
} from './types.js';
import { getDefaultDraftPublishConfig } from './types.js';

export type {
  Version,
  VersionStatus,
  VersionDiff,
  VersionAdapter,
  CreateVersionOptions,
  PublishVersionOptions,
  CompareVersionsOptions,
  VersionHistoryOptions,
  DraftPublishConfig,
  VersionPublishSchedule
} from './types.js';

export { getDefaultDraftPublishConfig } from './types.js';

export class VersionManager<T = Record<string, unknown>> {
  private adapter: VersionAdapter;
  private config: Required<DraftPublishConfig>;

  constructor(adapter: VersionAdapter, config?: DraftPublishConfig) {
    this.adapter = adapter;
    this.config = { ...getDefaultDraftPublishConfig(), ...config };
  }

  async createVersion(options: Omit<CreateVersionOptions<T>, 'version'>): Promise<Version<T>> {
    const latestVersion = await this.adapter.getLatestVersion(options.collection, options.documentId);
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const versionOptions = {
      ...options,
      version: nextVersion
    } as CreateVersionOptions<T>;

    const version = await this.adapter.createVersion(versionOptions);

    if (this.config.maxVersionsPerDocument > 0) {
      await this.pruneOldVersions(options.collection, options.documentId);
    }

    return version;
  }

  async publishVersion(options: PublishVersionOptions): Promise<void> {
    const version = await this.adapter.getVersion(options.collection, options.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (version.status === 'published') {
      throw new Error('Version is already published');
    }

    await this.adapter.publishVersion(options);
  }

  async unpublishDocument(collection: string, documentId: string): Promise<void> {
    const versions = await this.adapter.getVersions({
      collection,
      documentId,
      limit: 1000
    });

    for (const version of versions) {
      if (version.status === 'published') {
        await this.createVersion({
          collection,
          documentId,
          data: version.data as T,
          status: 'draft',
          createdBy: 'system',
          changeDescription: 'Unpublished document'
        });
        break;
      }
    }
  }

  async revertToVersion(
    collection: string,
    documentId: string,
    versionId: string,
    userId: string
  ): Promise<Version<T>> {
    const targetVersion = await this.adapter.getVersion(collection, versionId);
    if (!targetVersion) {
      throw new Error('Version not found');
    }

    const newVersion = await this.adapter.revertToVersion({
      collection,
      documentId,
      versionId,
      userId
    });

    return newVersion as Version<T>;
  }

  async getVersionHistory(
    collection: string,
    documentId: string,
    limit = 20,
    offset = 0
  ): Promise<Version<T>[]> {
    return this.adapter.getVersions({
      collection,
      documentId,
      limit,
      offset
    });
  }

  async compareTwoVersions(
    collection: string,
    documentId: string,
    versionA: string | number,
    versionB: string | number
  ): Promise<VersionDiff[]> {
    return this.adapter.compareVersions({
      collection,
      documentId,
      versionA,
      versionB
    });
  }

  async getLatestDraft(
    collection: string,
    documentId: string
  ): Promise<Version<T> | null> {
    return this.adapter.getLatestVersion(collection, documentId);
  }

  async getPublishedVersion(
    collection: string,
    documentId: string
  ): Promise<Version<T> | null> {
    return this.adapter.getPublishedVersion(collection, documentId);
  }

  async getVersion(
    collection: string,
    versionId: string
  ): Promise<Version<T> | null> {
    return this.adapter.getVersion(collection, versionId);
  }

  async schedulePublish(
    collection: string,
    documentId: string,
    versionId: string,
    scheduledFor: Date
  ): Promise<void> {
    if (!this.config.scheduleEnabled) {
      throw new Error('Scheduled publishing is not enabled');
    }

    const version = await this.adapter.getVersion(collection, versionId);
    if (!version) {
      throw new Error('Version not found');
    }
  }

  async deleteVersionHistory(
    collection: string,
    documentId: string
  ): Promise<void> {
    await this.adapter.deleteVersions(collection, documentId);
  }

  private async pruneOldVersions(
    collection: string,
    documentId: string
  ): Promise<void> {
    const versions = await this.adapter.getVersions({
      collection,
      documentId,
      limit: this.config.maxVersionsPerDocument + 100
    });

    if (versions.length <= this.config.maxVersionsPerDocument) {
      return;
    }

    const keepVersions = versions.slice(0, this.config.maxVersionsPerDocument);
    const versionsToDelete = versions.slice(this.config.maxVersionsPerDocument);

    for (const version of versionsToDelete) {
      if (version.status !== 'published') {
        await this.adapter.deleteVersions(collection, documentId);
        break;
      }
    }
  }
}

export function createVersionManager<T>(
  adapter: VersionAdapter,
  config?: DraftPublishConfig
): VersionManager<T> {
  return new VersionManager<T>(adapter, config);
}

export function isPublished(status: VersionStatus): boolean {
  return status === 'published';
}

export function isDraft(status: VersionStatus): boolean {
  return status === 'draft';
}

export function isArchived(status: VersionStatus): boolean {
  return status === 'archived';
}
