import path from "path";
import { getEncryptionKey } from "./encryption.js";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import crypto from "crypto";

export interface NodeStorageOptions {
  adapter?: "fs";
  connectionString?: string;
  namespace?: string;
  ttl?: number;
  encryption?: boolean;
  secret?: string;
  basePath?: string;
}

function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "hex").subarray(0, 32), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "hex").subarray(0, 32), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function createNodeStorage(
  options: NodeStorageOptions = {}
): Promise<{ storage: { getItem: (name: string) => Promise<string | null>; setItem: (name: string, value: string) => Promise<void>; removeItem: (name: string) => Promise<void> }; cleanup?: () => Promise<void> }> {
  const {
    namespace = "kyro",
    ttl,
    encryption = true,
    secret,
    basePath,
  } = options;

  const defaultPath = basePath
    ? path.join(basePath, ".astro", "kyro.json")
    : path.join(process.cwd(), ".astro", "kyro.json");

  const store = createStorage({
    driver: fsDriver({ base: defaultPath }),
  });

  const encKey = encryption ? getEncryptionKey(secret) : null;
  const prefix = namespace ? `${namespace}:` : "";

  return {
    storage: {
      getItem: async (name: string): Promise<string | null> => {
        const key = `${prefix}${name}`;
        const raw = await store.getItem<string>(key);
        if (raw == null) return null;
        try {
          const data = encKey ? decrypt(raw, encKey) : raw;
          const parsed = JSON.parse(data);
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
        await store.setItem(key, encKey ? encrypt(data, encKey) : data);
      },
      removeItem: async (name: string): Promise<void> => {
        await store.removeItem(`${prefix}${name}`);
      },
    },
    cleanup: async () => {
      await store.dispose?.();
    },
  };
}
