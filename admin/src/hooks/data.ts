import { useState, useEffect, useCallback } from "react";

export interface QueryOptions {
  page?: number;
  limit?: number;
  filter?: Record<string, unknown>;
  sort?: string;
  order?: "asc" | "desc";
}

export interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface MutationResult {
  mutate: (
    data?: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null>;
  loading: boolean;
  error: string | null;
}

function getApiUrl(path: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}${path}`;
}

export function useKyroQuery<T = Record<string, unknown>>(
  slug: string,
  options: QueryOptions = {},
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.page) params.set("page", String(options.page));
      if (options.limit) params.set("limit", String(options.limit));
      if (options.sort) params.set("sort", options.sort);
      if (options.order) params.set("order", options.order);

      const url = `${getApiUrl(`/api/${slug}`)}?${params.toString()}`;
      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      setData(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [slug, options.page, options.limit, options.sort, options.order]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useKyroMutation(
  slug: string,
  method: "POST" | "PATCH" | "DELETE" = "POST",
): MutationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (
      data?: Record<string, unknown>,
    ): Promise<Record<string, unknown> | null> => {
      setLoading(true);
      setError(null);
      try {
        const url = getApiUrl(`/api/${slug}`);
        const res = await fetch(url, {
          method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: data ? JSON.stringify(data) : undefined,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const json = await res.json();
        return json.data ?? json;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [slug, method],
  );

  return { mutate, loading, error };
}
