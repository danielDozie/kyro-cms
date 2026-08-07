import {
  templateCollections,
  allGlobalSettings,
} from "./src/templates/index.js";
import { AiAssistantPlugin, AiAutoSeoPlugin } from "@kyro-cms/ai";
import { setDbAdapter, loadSecrets, getAppSecret } from "./src/lib/secret.js";
import path from "path";
import fs from "fs";
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Database adapter setup - Cloudflare / Production vs Local SQLite
let adapter = null;

if (typeof window === "undefined") {
  const isCloudflare = typeof (globalThis as any).WebSocketPair !== "undefined" || process.env.CLOUDFLARE === "true";
  const envDB = (globalThis as any).DB || (process.env as any).DB;
  if (envDB) {
    try {
      const { createDrizzleAdapter } = await import("./src/database/drizzle/index.js");
      adapter = createDrizzleAdapter({
        type: 'sqlite',
        client: envDB,
      });
      setDbAdapter(adapter);
      await loadSecrets();
    } catch (error) {
      console.warn("[kyro.config] Cloudflare D1 adapter failed to load:", (error as Error).message);
    }
  } else if (process.env.DATABASE_URL) {
    try {
      const { createDrizzleAdapter } = await import("./src/database/drizzle/index.js");
      adapter = createDrizzleAdapter({
        type: 'postgres',
        connectionString: process.env.DATABASE_URL,
      });
      setDbAdapter(adapter);
      await loadSecrets();
    } catch (error) {
      console.warn("[kyro.config] Drizzle adapter failed to load:", (error as Error).message);
    }
  } else if (!isCloudflare) {
    // Reliably determine the project root regardless of where the command is run from
    const cwd = process.cwd();
    const rootDir = cwd.endsWith("admin") ? path.join(cwd, "..") : cwd;
    try {
      // We use dynamic imports to prevent Vite from bundling Node-only modules for the browser
      const { createLocalAdapter } = await import("./src/database/local/index.js");
      const { DatabaseSync } = await import("node:sqlite");

      const dbPath = path.resolve(rootDir, "data", "kyro.db");
      process.env.KYRO_AUTH_DB_PATH = dbPath; // Ensure auth adapter uses the same DB

      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const sqlite = new DatabaseSync(dbPath);
      adapter = createLocalAdapter({
        db: sqlite,
        path: dbPath,
      });

      // Initialize secret manager with DB adapter
      setDbAdapter(adapter);
      await loadSecrets();
    } catch (error) {
      console.warn(
        "[kyro.config] SQLite adapter unavailable — failed to load.",
      );
      console.warn(`  Message: ${(error as Error).message}`);
      if ((error as Error).stack) {
        console.warn(`  Stack: ${(error as Error).stack?.split('\n').slice(0, 3).join('\n')}`);
      }
    }
  }
}

export default {
  collections: templateCollections["kitchen-sink"],
  globals: allGlobalSettings,
  adapter,
  auth: {
    secret: getAppSecret(),
  },
  admin: {
    meta: {
      title: "Kyro CMS Admin",
      description: "Manage your content with ease",
    },
  },
  plugins: [
    new AiAssistantPlugin({
      provider: groq,
      modelName: 'llama-3.1-8b-instant',
    }),
    new AiAutoSeoPlugin({
      collections: ['posts', 'pages'],
      provider: groq,
      modelName: 'llama-3.1-8b-instant',
    }),
  ],
};
