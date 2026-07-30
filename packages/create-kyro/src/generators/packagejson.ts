import type { Answers } from "../prompts.js";

export interface PackageJson {
  name: string;
  version: string;
  type: string;
  private: boolean;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  overrides?: Record<string, string>;
}

export function generatePackageJson(
  answers: Answers,
): PackageJson {
  const deps: Record<string, string> = {
    "astro": "^7.1.5",
    "@astrojs/react": "^5.0.4",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@kyro-cms/core": "latest",
    "@kyro-cms/admin": "latest",
    // Core APIs
    "graphql": "^16.10.0",
    "graphql-yoga": "^5.21.2",
    // Storage Adapters
    "@aws-sdk/client-s3": "^3.751.0",
    "@aws-sdk/s3-request-presigner": "^3.751.0",
    "@smithy/node-http-handler": "^4.7.0",
    "basic-ftp": "^5.3.0",
    "ssh2": "^1.17.0",
    "ssh2-sftp-client": "^12.1.1",
    // Cache & Rate Limiting
    "ioredis": "^5.10.1",
  };

  // Database Adapters
  if (answers.database === "sqlite") {
    deps["better-sqlite3"] = "^11.8.0"; // Drizzle SQLite driver (Node 22/24 compatible)
  } else if (answers.database === "postgres") {
    deps["pg"] = "^8.11.3"; // Postgres driver
  } else if (answers.database === "mongodb") {
    deps["mongodb"] = "^6.3.0"; // MongoDB driver
  }

  const devDeps: Record<string, string> = {
    "typescript": "^5.7.3",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@astrojs/cloudflare": "^14.1.6",
    "wrangler": "^4.115.0",
  };

  const scripts: Record<string, string> = {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "kyro:dev": "kyro dev",
    "kyro:generate": "kyro generate",
    "deploy:cloudflare": "kyro deploy cloudflare",
    "deploy:cloudflare:ci": "kyro deploy cloudflare --non-interactive",
  };

  if (answers.database === "sqlite") {
    scripts["db:generate"] = "kyro generate";
    scripts["db:push"] = "kyro push";
    scripts["db:studio"] = "kyro studio";
  }

  return {
    name: answers.projectName,
    version: "0.1.0",
    type: "module",
    private: true,
    scripts,
    dependencies: deps,
    devDependencies: devDeps,
    overrides: {
      vite: "^7",
    },
  };
}

export function formatPackageJson(pkg: PackageJson): string {
  return JSON.stringify(pkg, null, 2);
}
