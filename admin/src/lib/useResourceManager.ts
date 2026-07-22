import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete, apiPatch } from "./api";
import { useUIStore, toast } from "./stores";

interface UseResourceManagerOptions<T> {
  endpoint: string;
  onSuccess?: (action: "load" | "create" | "delete" | "update", data?: unknown) => void;
  onError?: (action: "load" | "create" | "delete" | "update", error: unknown) => void;
  transformLoad?: (data: unknown[]) => T[];
}

export function useResourceManager<T extends { id: string }>(
  options: UseResourceManagerOptions<T>
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { confirm } = useUIStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<any>(options.endpoint);
      const data = Array.isArray(response) ? response : response.docs || [];
      const transformed = options.transformLoad ? options.transformLoad(data) : data;
      setItems(transformed);
      options.onSuccess?.("load", transformed);
} catch (e: unknown) {
       const message = e instanceof Error ? e.message : "Failed to load resources";
       setError(message);
       options.onError?.("load", e as Error);
    } finally {
      setLoading(false);
    }
  }, [options.endpoint, options.transformLoad]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback((id: string, resourceName = "item") => {
    confirm({
      title: `Delete ${resourceName}`,
      message: `Are you sure you want to delete this ${resourceName.toLowerCase()}? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiDelete(`${options.endpoint}/${id}`);
          setItems((prev) => prev.filter((item) => item.id !== id));
          options.onSuccess?.("delete", id);
          toast.success(`${resourceName} deleted`);
} catch (e: unknown) {
           const message = e instanceof Error ? e.message : `Failed to delete ${resourceName}`;
           toast.error(message);
           options.onError?.("delete", e as Error);
        }
      },
    });
  }, [options.endpoint, confirm]);

  const create = useCallback(async (data: unknown) => {
    setError(null);
    try {
      const created = await apiPost<T>(options.endpoint, data);
      setItems((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      options.onSuccess?.("create", created);
      return created;
} catch (e: unknown) {
       const message = e instanceof Error ? e.message : "Failed to create resource";
       setError(message);
       options.onError?.("create", e as Error);
      throw e;
    }
  }, [options.endpoint]);

  const update = useCallback(async (id: string, data: unknown) => {
    setError(null);
    try {
      const updated = await apiPatch<T>(`${options.endpoint}/${id}`, data);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      options.onSuccess?.("update", updated);
      return updated;
} catch (e: unknown) {
       const message = e instanceof Error ? e.message : "Failed to update resource";
       setError(message);
       options.onError?.("update", e as Error);
      throw e;
    }
  }, [options.endpoint]);

  return {
    items,
    setItems,
    loading,
    error,
    load,
    remove,
    create,
    update,
    isCreateModalOpen,
    setIsCreateModalOpen,
  };
}
