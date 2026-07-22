export type StorageAdapter = 'indexeddb' | 'fs' | 'redis' | 'sqlite' | 'postgres';

export type Environment = 'browser' | 'node';

export interface EncryptionConfig {
  enabled: boolean;
  algorithm?: 'AES-256-GCM' | 'ChaCha20-Poly1305';
}

export interface StorageConfig {
  environment: Environment;
  adapter?: StorageAdapter;
  connectionString?: string;
  encryption?: EncryptionConfig;
}

export interface StorageOptions {
  namespace?: string;
  ttl?: number;
}

export type CreateStorageResult = {
  storage: {
    getItem: (name: string) => string | null | Promise<string | null>;
    setItem: (name: string, value: string) => void | Promise<void>;
    removeItem: (name: string) => void | Promise<void>;
  };
  cleanup?: () => Promise<void>;
};
