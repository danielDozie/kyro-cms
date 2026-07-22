import type { StorageConfig, StorageAdapter, CreateStorageResult } from './types.js';
import { createBrowserStorage } from './browser.js';
import { createNodeStorage } from './node.js';
import { getEncryptionKey } from './encryption.js';

export type { StorageConfig, StorageAdapter, Environment, EncryptionConfig } from './types.js';
export { getEncryptionKey } from './encryption.js';

export async function createStorage(config: StorageConfig): Promise<CreateStorageResult & { storage: _StateStorage }> {
  const { environment, adapter, connectionString, encryption } = config;

  const secret = process.env.APP_SECRET || process.env.AUTH_SECRET;

  const encryptionOptions = {
    enabled: encryption?.enabled ?? true,
    algorithm: encryption?.algorithm,
  };

  if (environment === 'browser') {
    return createBrowserStorage({
      namespace: 'kyro',
    });
  }

  return createNodeStorage({
    adapter: (adapter || 'fs') as "fs",
    connectionString,
    namespace: 'kyro',
    encryption: encryptionOptions.enabled,
    secret,
  });
}

type _StateStorage = {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
};

export function createSyncStorage(config: StorageConfig): _StateStorage {
  const { environment } = config;

  if (typeof globalThis !== 'undefined' && (globalThis as any).window || environment === 'browser') {
    return {
      getItem: (name: string): string | null => {
        try {
          return localStorage.getItem(name);
        } catch {
          return null;
        }
      },
      setItem: (name: string, value: string): void => {
        try {
          localStorage.setItem(name, value);
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
      },
      removeItem: (name: string): void => {
        try {
          localStorage.removeItem(name);
        } catch (e) {
          console.error('Failed to remove from localStorage:', e);
        }
      },
    };
  }

  return {
    getItem: async (): Promise<string | null> => null,
    setItem: async (): Promise<void> => {},
    removeItem: async (): Promise<void> => {},
  };
}

export async function createAuthStorage(config: StorageConfig): Promise<CreateStorageResult> {
  const storageConfig: StorageConfig = {
    ...config,
    encryption: {
      enabled: true,
      algorithm: config.encryption?.algorithm,
    },
  };

  return createStorage(storageConfig);
}

export { createBrowserStorage } from './browser.js';
export { createNodeStorage } from './node.js';
