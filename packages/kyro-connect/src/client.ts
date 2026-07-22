import { KyroConnectError } from "./errors.js";

export interface ClientOptions {
  url: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
}

export interface ProcedureClient<I, O> {
  (input: I): Promise<O>;
  query: (input: I) => Promise<O>;
  mutate: (input: I) => Promise<O>;
}

export type RouterClient<T> = {
  [K in keyof T]: T[K] extends { input: infer I; output: infer O }
    ? ProcedureClient<I, O>
    : T[K] extends Record<string, unknown>
      ? RouterClient<T[K]>
      : T[K];
};

export interface CollectionFindResult<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface CollectionFindParams {
  draft?: boolean;
  depth?: number;
  sort?: string;
  page?: number;
  limit?: number;
  select?: string;
  where?: Record<string, unknown>;
}

export interface CollectionClient<T, F = CollectionFindParams> {
  find(params?: F & CollectionFindParams): Promise<CollectionFindResult<T>>;
  findByID(id: string, params?: { draft?: boolean; depth?: number; select?: string }): Promise<T | null>;
  create(data: Partial<T>, params?: { draft?: boolean; depth?: number }): Promise<T>;
  update(id: string, data: Partial<T>, params?: { draft?: boolean; depth?: number }): Promise<T>;
  delete(id: string): Promise<{ message: string }>;
}

export interface GqlClient {
  <TData = Record<string, unknown>, TVars extends Record<string, unknown> = Record<string, unknown>>(
    query: string | { toString(): string },
    variables?: TVars,
  ): Promise<TData>;
}

export interface UploadClient {
  <TResult = unknown>(url: string, file: File | Blob, filename?: string): Promise<TResult>;
}

export interface GlobalClient<T> {
  get(params?: { draft?: boolean; depth?: number; select?: string }): Promise<T | null>;
  update(data: Partial<T>, params?: { draft?: boolean; depth?: number }): Promise<T>;
}

export type KyroClient<TRouter> = RouterClient<TRouter> & {
  collection: <T, F = CollectionFindParams>(slug: string) => CollectionClient<T, F>;
  global: <T>(slug: string) => GlobalClient<T>;
  gql: GqlClient;
  upload: UploadClient;
};

const MUTATIONS = new Set(["create", "update", "delete", "mutate"]);

async function handleResponse<T = unknown>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: Record<string, unknown> | undefined;
    try {
      body = await res.json();
    } catch {
      throw new KyroConnectError(res.statusText, res.status);
    }
    const message = typeof body?.error === "string" ? body.error : res.statusText;
    throw new KyroConnectError(message, res.status, body);
  }
  const body: unknown = await res.json();
  if (body && typeof body === "object" && "result" in body) {
    return (body as { result: { data: T } }).result.data;
  }
  return body as T;
}

function buildSearchParams(params?: Record<string, unknown>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      sp.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function createClient<TRouter extends Record<string, unknown> = Record<string, unknown>>(
  opts: ClientOptions,
): KyroClient<TRouter> {
  const baseUrl = opts.url.replace(/\/$/, "");
  const doFetch = opts.fetch ?? globalThis.fetch;

  function headers(extra?: Record<string, string>): Record<string, string> {
    return {
      ...(opts.apiKey ? { "x-api-key": opts.apiKey } : {}),
      ...extra,
    };
  }

  function makeRequest<I, O>(path: string[], input: I): Promise<O> {
    const name = path[path.length - 1];
    const pathStr = path.join(".");
    const isMutation = MUTATIONS.has(name);

    if (isMutation) {
      return doFetch(`${baseUrl}/${pathStr}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(input),
      }).then((res) => handleResponse<O>(res));
    }

    const qs = encodeURIComponent(JSON.stringify(input));
    return doFetch(`${baseUrl}/${pathStr}?input=${qs}`, {
      method: "GET",
      headers: headers(),
    }).then((res) => handleResponse<O>(res));
  }

  function buildProxy(path: string[]) {
    return new Proxy(function () {
      /* noop — proxy target */
    } as unknown as Record<string, unknown>, {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop];
        return buildProxy([...path, prop]);
      },
      apply(_, __, args: unknown[]) {
        return makeRequest(path, args[0] ?? {});
      },
    });
  }

  const collection = <T, F = CollectionFindParams>(slug: string): CollectionClient<T, F> => ({
    async find(params) {
      const res = await doFetch(`${baseUrl}/api/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "GET",
        headers: headers(),
      });
      return handleResponse<CollectionFindResult<T>>(res);
    },
    async findByID(id, params) {
      const res = await doFetch(`${baseUrl}/api/${slug}/${id}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "GET",
        headers: headers(),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as unknown as T | null);
    },
    async create(data, params) {
      const res = await doFetch(`${baseUrl}/api/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(data),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as T);
    },
    async update(id, data, params) {
      const res = await doFetch(`${baseUrl}/api/${slug}/${id}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(data),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as T);
    },
    async delete(id) {
      const res = await doFetch(`${baseUrl}/api/${slug}/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      return handleResponse<{ message: string }>(res);
    },
  });

  const global = <T>(slug: string): GlobalClient<T> => ({
    async get(params) {
      const res = await doFetch(`${baseUrl}/api/globals/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "GET",
        headers: headers(),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as unknown as T | null);
    },
    async update(data, params) {
      const res = await doFetch(`${baseUrl}/api/globals/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(data),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as T);
    },
  });

  const gql: GqlClient = async <TData, TVars extends Record<string, unknown>>(
    query: string | { toString(): string },
    variables?: TVars,
  ): Promise<TData> => {
    const queryStr = typeof query === "string" ? query : query.toString();
    const res = await doFetch(`${baseUrl}/api/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ query: queryStr, variables }),
    });
    const body = (await res.json()) as { data?: TData; errors?: Array<{ message: string }> };
    if (body.errors) {
      throw new KyroConnectError(body.errors[0]?.message || "GraphQL error", res.status, body);
    }
    return body.data as TData;
  };

  const upload: UploadClient = async <TResult = unknown>(
    url: string,
    file: File | Blob,
    filename?: string,
  ): Promise<TResult> => {
    const formData = new FormData();
    formData.append("file", file, filename);
    const res = await doFetch(`${baseUrl}${url}`, {
      method: "POST",
      headers: headers(),
      body: formData,
    });
    return handleResponse<TResult>(res);
  };

  const proxy = buildProxy([]) as RouterClient<TRouter>;
  return Object.assign(proxy, {
    collection: collection as unknown as KyroClient<TRouter>["collection"],
    global: global as unknown as KyroClient<TRouter>["global"],
    gql: gql as unknown as KyroClient<TRouter>["gql"],
    upload: upload as unknown as KyroClient<TRouter>["upload"],
  }) as unknown as KyroClient<TRouter>;
}
