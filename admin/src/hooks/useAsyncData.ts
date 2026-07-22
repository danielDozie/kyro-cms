import { useState, useEffect, useCallback } from "react";

export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: { initialData?: T; onError?: (err: Error) => void }
): AsyncDataState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: options?.initialData ?? null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setState(prev => ({ ...prev, loading: false, error: message }));
      options?.onError?.(err instanceof Error ? err : new Error(message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refetch: fetch };
}
