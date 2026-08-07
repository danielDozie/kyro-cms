import type { BaseAdapter } from "../../registry/types.js";
import type { User } from "../../hooks/types.js";

interface LoaderOptions {
  db: BaseAdapter;
  tenantId?: string;
  user?: User;
}

export class RelationLoader {
  private db: BaseAdapter;
  private tenantId?: string;
  private user?: User;
  private caches = new Map<string, Map<string, any>>();
  private pending = new Map<string, Set<string>>();
  private waiting = new Map<string, ((value: any) => void)[]>();
  private flushScheduled = false;

  constructor(opts: LoaderOptions) {
    this.db = opts.db;
    this.tenantId = opts.tenantId;
    this.user = opts.user;
  }

  private getCacheKey(collection: string): string {
    return collection;
  }

  async load(collection: string, id: string): Promise<any | undefined> {
    const key = this.getCacheKey(collection);
    let cache = this.caches.get(key);
    if (!cache) {
      cache = new Map();
      this.caches.set(key, cache);
    }
    if (cache.has(id)) {
      return cache.get(id);
    }

    let pendingSet = this.pending.get(key);
    if (!pendingSet) {
      pendingSet = new Set();
      this.pending.set(key, pendingSet);
    }
    pendingSet.add(id);
    cache.set(id, undefined);

    if (!this.flushScheduled) {
      this.flushScheduled = true;
      queueMicrotask(() => {
        this.flushScheduled = false;
        this.flushAll();
      });
    }

    return new Promise((resolve) => {
      let callbacks = this.waiting.get(`${key}:${id}`);
      if (!callbacks) {
        callbacks = [];
        this.waiting.set(`${key}:${id}`, callbacks);
      }
      callbacks.push(resolve);
    });
  }

  async flushAll(): Promise<void> {
    for (const [key, ids] of this.pending) {
      if (ids.size === 0) continue;

      const collectionSlug = key;
      const idArray = Array.from(ids);
      this.pending.delete(key);

      try {
        const result = await this.db.find({
          collection: collectionSlug,
          where: { id: { in: idArray } },
          limit: idArray.length,
          tenantId: this.tenantId,
        });

        const cache = this.caches.get(key) || new Map();
        const docsById = new Map<string, any>();
        for (const doc of result.docs) {
          docsById.set((doc as any).id, doc);
          cache.set((doc as any).id, doc);
        }

        for (const id of idArray) {
          const callbacks = this.waiting.get(`${key}:${id}`);
          if (callbacks) {
            const found = docsById.get(id);
            for (const cb of callbacks) {
              cb(found);
            }
            this.waiting.delete(`${key}:${id}`);
          }
        }
      } catch (e) {
        console.error(`[RelationLoader] Failed to batch load ${collectionSlug}:`, e);
        for (const id of idArray) {
          const callbacks = this.waiting.get(`${key}:${id}`);
          if (callbacks) {
            for (const cb of callbacks) {
              cb(undefined);
            }
            this.waiting.delete(`${key}:${id}`);
          }
        }
      }
    }
  }

  async loadMany(collection: string, ids: string[]): Promise<(any | undefined)[]> {
    return Promise.all(ids.map((id) => this.load(collection, id)));
  }

  resolveOne(collection: string, id: string): any | undefined {
    return this.caches.get(this.getCacheKey(collection))?.get(id);
  }
}
