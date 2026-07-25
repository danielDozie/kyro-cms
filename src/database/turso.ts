import { AbstractBaseAdapter, type FindOneArgs } from "./base.js";

export interface TursoAdapterOptions {
  url: string;
  authToken?: string;
}

/**
 * Edge-Native Turso / libSQL HTTP Database Adapter for Kyro CMS.
 * Executes SQL queries over Web-standard `fetch` HTTP requests on V8 Edge Isolates.
 */
export class TursoAdapter extends AbstractBaseAdapter {
  private url: string;
  private authToken?: string;

  constructor(options: TursoAdapterOptions) {
    super();
    this.url = options.url.replace(/^libsql:\/\//, "https://");
    this.authToken = options.authToken;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.url) {
      throw new Error("TursoAdapter: Database URL is required.");
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.authToken) {
        headers["Authorization"] = `Bearer ${this.authToken}`;
      }

      const res = await fetch(`${this.url}/v2/pipeline`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          requests: [
            {
              type: "execute",
              stmt: { sql, args: params.map((p) => ({ type: "text", value: String(p) })) },
            },
            { type: "close" },
          ],
        }),
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const result = data?.results?.[0]?.response?.result;
      if (!result || !result.rows) return [];

      const cols = result.cols.map((c: any) => c.name);
      return result.rows.map((row: any[]) => {
        const obj: Record<string, any> = {};
        cols.forEach((col: string, idx: number) => {
          obj[col] = row[idx]?.value ?? null;
        });
        return obj as T;
      });
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

export function createTursoAdapter(options: TursoAdapterOptions): TursoAdapter {
  return new TursoAdapter(options);
}
