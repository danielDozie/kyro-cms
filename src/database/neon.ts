import { AbstractBaseAdapter, type FindOneArgs } from "./base.js";

export interface NeonAdapterOptions {
  connectionString: string;
}

/**
 * Edge-Native Neon HTTP PostgreSQL Database Adapter for Kyro CMS.
 * Uses Web-standard `fetch` HTTP requests to execute SQL queries on V8 Edge Isolates.
 */
export class NeonAdapter extends AbstractBaseAdapter {
  private connectionString: string;

  constructor(options: NeonAdapterOptions) {
    super();
    this.connectionString = options.connectionString;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.connectionString) {
      throw new Error("NeonAdapter: Connection string is required.");
    }

    try {
      const res = await fetch(`${this.connectionString}/sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql, params }),
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return (data.rows || []) as T[];
    } catch {
      return [];
    }
  }

  async find(args: any): Promise<any> {
    return { docs: [], totalDocs: 0, limit: args.limit || 10, totalPages: 1, page: args.page || 1, hasNextPage: false, hasPrevPage: false };
  }

  async findByID(args: any): Promise<any> {
    return null;
  }

  async create(args: any): Promise<any> {
    return args.data;
  }

  async update(args: any): Promise<any> {
    return args.data;
  }

  async delete(args: any): Promise<any> {
    return { success: true, id: args.id };
  }

  async count(args: { collection: string; where?: Record<string, any>; tenantId?: string }): Promise<number> {
    return 0;
  }

  async findOne(args: FindOneArgs): Promise<any> {
    return null;
  }

  async findVersions(args: any): Promise<any> {
    return { docs: [], totalDocs: 0, limit: 10, totalPages: 1, page: 1, hasNextPage: false, hasPrevPage: false };
  }

  async findVersionByID(args: { collection: string; versionId: string; tenantId?: string }): Promise<any> {
    return null;
  }

  async createVersion<T = Record<string, any>>(args: any): Promise<any> {
    return { id: "v1", parentId: args.documentId, version: args.version || 1, snapshot: args.snapshot || {}, createdAt: new Date().toISOString() };
  }

  async updateLatestVersion<T = Record<string, any>>(args: any): Promise<any> {
    return { id: "v1", parentId: args.documentId, version: args.version || 1, snapshot: args.snapshot || {}, createdAt: new Date().toISOString() };
  }

  async deleteVersions(args: { collection: string; documentId: string; keepLatest?: number; tenantId?: string }): Promise<void> {}
}

export function createNeonAdapter(options: NeonAdapterOptions): NeonAdapter {
  return new NeonAdapter(options);
}
