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

export type InferDocFromRouter<TRouter, K> = K extends keyof TRouter
  ? TRouter[K] extends { findByID: { output: infer Doc } }
    ? Doc
    : TRouter[K] extends { find: { output: { docs: Array<infer Doc> } } }
      ? Doc
      : any
  : any;

export type InferFindInputFromRouter<TRouter, K> = K extends keyof TRouter
  ? TRouter[K] extends { find: { input: infer FindInput } }
    ? FindInput
    : CollectionFindParams
  : CollectionFindParams;

export type InferGlobalFromRouter<TRouter, K> = K extends keyof TRouter
  ? TRouter[K] extends { get: { output: infer Doc } }
    ? Doc
    : any
  : any;

export type CollectionGetter<TRouter> = {
  <K extends keyof TRouter & string>(
    slug: K
  ): CollectionClient<
    InferDocFromRouter<TRouter, K>,
    InferFindInputFromRouter<TRouter, K>
  >;
  <T = any, F = CollectionFindParams>(
    slug: string & {}
  ): CollectionClient<T, F>;
};

export type GlobalGetter<TRouter> = {
  <K extends keyof TRouter & string>(
    slug: K
  ): GlobalClient<InferGlobalFromRouter<TRouter, K>>;
  <T = any>(
    slug: string & {}
  ): GlobalClient<T>;
};

export type KyroClient<TRouter> = RouterClient<TRouter> & {
  collection: CollectionGetter<TRouter>;
  global: GlobalGetter<TRouter>;
  gql: GqlClient;
  upload: UploadClient;
};

const MUTATIONS = new Set(["create", "update", "delete", "mutate"]);

function sanitizeDoc<T = any>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((item) => sanitizeDoc(item)) as unknown as T;
  if (typeof input === "object" && !(input instanceof Date) && !(input instanceof RegExp)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      if (/^\d+$/.test(key)) continue;
      cleaned[key] = sanitizeDoc((input as any)[key]);
    }
    return cleaned as T;
  }
  return input;
}

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
  const cleaned = sanitizeDoc(body);
  if (cleaned && typeof cleaned === "object" && "result" in cleaned) {
    return (cleaned as { result: { data: T } }).result.data;
  }
  return cleaned as T;
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

export function createClient<TRouter = Record<string, unknown>>(
  opts: ClientOptions,
): KyroClient<TRouter> {
  const cleanUrl = opts.url.replace(/\/$/, "");
  const rootUrl = cleanUrl.replace(/\/(api\/trpc|api|trpc)$/, "");
  const trpcUrl = `${rootUrl}/api/trpc`;
  const restUrl = `${rootUrl}/api`;
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
      return doFetch(`${trpcUrl}/${pathStr}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(input),
      }).then((res) => handleResponse<O>(res));
    }

    const qs = encodeURIComponent(JSON.stringify(input));
    return doFetch(`${trpcUrl}/${pathStr}?input=${qs}`, {
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
      const res = await doFetch(`${restUrl}/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "GET",
        headers: headers(),
      });
      return handleResponse<CollectionFindResult<T>>(res);
    },
    async findByID(id, params) {
      const res = await doFetch(`${restUrl}/${slug}/${id}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "GET",
        headers: headers(),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as unknown as T | null);
    },
    async create(data, params) {
      const res = await doFetch(`${restUrl}/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(data),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as T);
    },
    async update(id, data, params) {
      const res = await doFetch(`${restUrl}/${slug}/${id}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(data),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as T);
    },
    async delete(id) {
      const res = await doFetch(`${restUrl}/${slug}/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      return handleResponse<{ message: string }>(res);
    },
  });

  const global = <T>(slug: string): GlobalClient<T> => ({
    async get(params) {
      const res = await doFetch(`${restUrl}/globals/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
        method: "GET",
        headers: headers(),
      });
      const body = await handleResponse<{ data: T }>(res);
      return body?.data ?? (body as unknown as T | null);
    },
    async update(data, params) {
      const res = await doFetch(`${restUrl}/globals/${slug}${buildSearchParams(params as Record<string, unknown>)}`, {
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
    const res = await doFetch(`${restUrl}/graphql`, {
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
    const targetUrl = url.startsWith("http") ? url : `${rootUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    const res = await doFetch(targetUrl, {
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
