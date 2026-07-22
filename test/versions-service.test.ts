import { describe, it, expect, beforeEach } from "vitest";
import {
  VersionManager,
  isPublished,
  isDraft,
  isArchived,
  type VersionAdapter,
  type Version,
} from "../src/versions/index.js";

describe("Version Management System", () => {
  let mockStorage: Map<string, Version<any>[]>;
  let mockAdapter: VersionAdapter;

  beforeEach(() => {
    mockStorage = new Map();

    mockAdapter = {
      async createVersion(options) {
        const key = `${options.collection}:${options.documentId}`;
        const existing = mockStorage.get(key) || [];
        const newVersion: Version<any> = {
          id: `v_${existing.length + 1}`,
          collection: options.collection,
          documentId: options.documentId,
          version: options.version,
          data: options.data,
          status: options.status || "draft",
          createdBy: options.createdBy,
          createdAt: new Date(),
        };
        mockStorage.set(key, [newVersion, ...existing]);
        return newVersion;
      },
      async getVersion(collection, versionId) {
        for (const list of mockStorage.values()) {
          const found = list.find((v) => v.id === versionId);
          if (found) return found;
        }
        return null;
      },
      async getLatestVersion(collection, documentId) {
        const key = `${collection}:${documentId}`;
        const list = mockStorage.get(key) || [];
        return list[0] || null;
      },
      async getPublishedVersion(collection, documentId) {
        const key = `${collection}:${documentId}`;
        const list = mockStorage.get(key) || [];
        return list.find((v) => v.status === "published") || null;
      },
      async getVersions(options) {
        const key = `${options.collection}:${options.documentId}`;
        return mockStorage.get(key) || [];
      },
      async publishVersion(options) {
        for (const list of mockStorage.values()) {
          const found = list.find((v) => v.id === options.versionId);
          if (found) {
            found.status = "published";
            found.publishedAt = new Date();
          }
        }
      },
      async revertToVersion<T>(options: { collection: string; documentId: string; versionId: string; userId: string }): Promise<Version<T>> {
        const target = await this.getVersion(options.collection, options.versionId);
        if (!target) throw new Error("Version not found");
        return (await this.createVersion({
          collection: options.collection,
          documentId: options.documentId,
          version: 99,
          data: target.data,
          status: "draft",
          createdBy: options.userId,
        })) as Version<T>;
      },
      async deleteVersions(collection, documentId) {
        const key = `${collection}:${documentId}`;
        mockStorage.delete(key);
      },
      async compareVersions() {
        return [];
      },
    };
  });

  describe("Helper Status Functions", () => {
    it("identifies statuses correctly", () => {
      expect(isPublished("published")).toBe(true);
      expect(isDraft("draft")).toBe(true);
      expect(isArchived("archived")).toBe(true);
    });
  });

  describe("VersionManager Operations", () => {
    it("creates sequential document versions", async () => {
      const manager = new VersionManager(mockAdapter);

      const v1 = await manager.createVersion({
        collection: "posts",
        documentId: "doc-1",
        data: { title: "Draft 1" },
        status: "draft",
        createdBy: "user-1",
      });

      expect(v1.version).toBe(1);
      expect(v1.status).toBe("draft");

      const v2 = await manager.createVersion({
        collection: "posts",
        documentId: "doc-1",
        data: { title: "Draft 2" },
        status: "draft",
        createdBy: "user-1",
      });

      expect(v2.version).toBe(2);
    });

    it("publishes a draft version", async () => {
      const manager = new VersionManager(mockAdapter);

      const v1 = await manager.createVersion({
        collection: "posts",
        documentId: "doc-1",
        data: { title: "Ready Post" },
        status: "draft",
        createdBy: "user-1",
      });

      await manager.publishVersion({
        collection: "posts",
        documentId: "doc-1",
        versionId: v1.id,
        publishedBy: "user-1",
      });

      const published = await manager.getPublishedVersion("posts", "doc-1");
      expect(published).toBeDefined();
      expect(published?.id).toBe(v1.id);
      expect(published?.status).toBe("published");
    });
  });
});
