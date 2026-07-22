// ============================================================================
// Pub/Sub Event Emitter
// ============================================================================

export type EventHandler = (data: any) => void | Promise<void>;

export class PubSub {
  private channels: Map<string, Set<EventHandler>> = new Map();
  private maxListeners: number;

  constructor(maxListeners = 100) {
    this.maxListeners = maxListeners;
  }

  subscribe(channel: string, handler: EventHandler): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    const handlers = this.channels.get(channel)!;
    if (handlers.size >= this.maxListeners) {
      throw new Error(`Max listeners (${this.maxListeners}) reached for channel "${channel}"`);
    }

    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.channels.delete(channel);
      }
    };
  }

  publish(channel: string, data: any): void {
    const handlers = this.channels.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            result.catch((err) => {
              console.error(`[PubSub] Error in handler for channel "${channel}":`, err);
            });
          }
        } catch (err) {
          console.error(`[PubSub] Error in handler for channel "${channel}":`, err);
        }
      }
    }
  }

  hasSubscribers(channel: string): boolean {
    return this.channels.has(channel) && this.channels.get(channel)!.size > 0;
  }

  getSubscriberCount(channel: string): number {
    return this.channels.get(channel)?.size || 0;
  }

  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  clear(): void {
    this.channels.clear();
  }
}

// ============================================================================
// Kyro-specific Event Types
// ============================================================================

export interface KyroEvent {
  type: 'create' | 'update' | 'delete';
  collection: string;
  doc?: any;
  originalDoc?: any;
  id?: string;
  tenantId?: string;
  timestamp: string;
  user?: any;
}

// ============================================================================
// Kyro Pub/Sub with Hook Integration
// ============================================================================

export class KyroPubSub extends PubSub {
  private registry: any;

  constructor(registry: any, maxListeners = 100) {
    super(maxListeners);
    this.registry = registry;
  }

  // Publish collection-level events
  publishCollectionEvent(collection: string, event: KyroEvent): void {
    // Publish to collection channel
    this.publish(`collection:${collection}`, event);

    // Publish to global events channel
    this.publish('events:collection', event);

    // Publish to tenant-specific channel if scoped
    if (event.tenantId) {
      this.publish(`tenant:${event.tenantId}:collection:${collection}`, event);
      this.publish(`tenant:${event.tenantId}:events`, event);
    }

    // Publish to type-specific channel
    this.publish(`collection:${collection}:${event.type}`, event);
  }

  // Subscribe to a collection
  subscribeToCollection(collection: string, handler: EventHandler): () => void {
    return this.subscribe(`collection:${collection}`, handler);
  }

  // Subscribe to a specific event type on a collection
  subscribeToCollectionEvent(
    collection: string,
    eventType: 'create' | 'update' | 'delete',
    handler: EventHandler
  ): () => void {
    return this.subscribe(`collection:${collection}:${eventType}`, handler);
  }

  // Subscribe to tenant-scoped events
  subscribeToTenant(tenantId: string, handler: EventHandler): () => void {
    return this.subscribe(`tenant:${tenantId}:events`, handler);
  }

  // Subscribe to tenant + collection events
  subscribeToTenantCollection(
    tenantId: string,
    collection: string,
    handler: EventHandler
  ): () => void {
    return this.subscribe(`tenant:${tenantId}:collection:${collection}`, handler);
  }

  // Subscribe to all collection events
  subscribeToAllCollections(handler: EventHandler): () => void {
    return this.subscribe('events:collection', handler);
  }

  // Create hooks for afterChange/afterDelete
  createAfterChangeHook(collection: string) {
    return async (args: any) => {
      this.publishCollectionEvent(collection, {
        type: args.operation === 'create' ? 'create' : 'update',
        collection,
        doc: args.doc,
        originalDoc: args.originalDoc,
        id: args.id || args.doc?.id,
        tenantId: args.tenantId,
        timestamp: new Date().toISOString(),
        user: args.user,
      });
    };
  }

  createAfterDeleteHook(collection: string) {
    return async (args: any) => {
      this.publishCollectionEvent(collection, {
        type: 'delete',
        collection,
        doc: args.doc,
        originalDoc: args.originalDoc,
        id: args.id || args.doc?.id,
        tenantId: args.tenantId,
        timestamp: new Date().toISOString(),
        user: args.user,
      });
    };
  }

  // Auto-register hooks for all collections
  autoRegisterHooks(): void {
    const collections = this.registry.getCollections();
    for (const collection of collections) {
      const config = this.registry.getCollection(collection.slug);
      if (config) {
        if (!config.hooks) config.hooks = {};
        if (!config.hooks.afterChange) config.hooks.afterChange = [];
        if (!config.hooks.afterDelete) config.hooks.afterDelete = [];

        config.hooks.afterChange.push(this.createAfterChangeHook(collection.slug));
        config.hooks.afterDelete.push(this.createAfterDeleteHook(collection.slug));
      }
    }
  }
}
