import { createStorage } from "unstorage";
import indexedbDriver from "unstorage/drivers/indexedb";

export interface BrowserStorageOptions {
  namespace?: string;
  ttl?: number;
}

export async function createBrowserStorage(
  options: BrowserStorageOptions = {},
): Promise<{
  storage: { getItem: (name: string) => Promise<string | null>; setItem: (name: string, value: string) => Promise<void>; removeItem: (name: string) => Promise<void> };
  cleanup?: () => Promise<void>;
}> {
  const { namespace = "kyro", ttl } = options;

  const store = createStorage({
    driver: indexedbDriver({
      dbName: "kyro-cms",
      storeName: namespace,
    }),
  });

  const prefix = namespace ? `${namespace}:` : "";

  const storage = {
    getItem: async (name: string): Promise<string | null> => {
      const key = `${prefix}${name}`;
      const raw = await store.getItem<string>(key);
      if (raw == null) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.expiry && Date.now() > parsed.expiry) {
          await store.removeItem(key);
          return null;
        }
        return parsed.value;
      } catch {
        return raw;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      const key = `${prefix}${name}`;
      const data = JSON.stringify(
        ttl ? { value, expiry: Date.now() + ttl } : { value }
      );
      await store.setItem(key, data);
    },
    removeItem: async (name: string): Promise<void> => {
      await store.removeItem(`${prefix}${name}`);
    },
  };

  return {
    storage,
    cleanup: async () => {
      await store.dispose?.();
    },
  };
}
