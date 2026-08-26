import type { Answers } from "../prompts.js";
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";

function generateAppSecret(): string {
  return randomBytes(32).toString("hex");
}

export interface AdminCredentials {
  adminEmail: string;
  adminPassword: string;
}

export function generateProjectFiles(
  answers: Answers,
  projectDir: string,
  adminCredentials?: AdminCredentials,
): void {
  const srcDir = join(projectDir, "src");
  const pagesDir = join(srcDir, "pages");
  const stylesDir = join(srcDir, "styles");
  const publicDir = join(projectDir, "public");

  const agentsDir = join(projectDir, ".agents");
  const scriptsDir = join(projectDir, "scripts");
  mkdirSync(pagesDir, { recursive: true });
  mkdirSync(stylesDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(agentsDir, { recursive: true });
  mkdirSync(scriptsDir, { recursive: true });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const logos = ["logo.svg", "logo-white.svg", "favicon.svg"];
  for (const logo of logos) {
    const srcLogoPath = join(__dirname, logo);
    if (existsSync(srcLogoPath)) {
      copyFileSync(srcLogoPath, join(publicDir, logo));
    }
  }

  if (answers.database === "sqlite") {
    mkdirSync(join(projectDir, "data"), { recursive: true });
  }

  const tsconfig = `{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}`;

  writeFileSync(join(projectDir, "tsconfig.json"), tsconfig);

  const gitignore = `node_modules/
dist/
.astro/
data/
*.db
.env
.env.local
.DS_Store
`;

  writeFileSync(join(projectDir, ".gitignore"), gitignore);

  const dbInstructions =
    answers.database === "postgres"
      ? `\n## Database Setup\n\nSet your \`DATABASE_URL\` in \`.env\` before starting the server:\n\n\`\`\`env\nDATABASE_URL=postgresql://user:password@localhost:5432/kyro_cms\n\`\`\`\n`
      : answers.database === "mongodb"
        ? `\n## Database Setup\n\nSet your \`MONGODB_URI\` in \`.env\` before starting the server:\n\n\`\`\`env\nMONGODB_URI=mongodb://localhost:27017/kyro_cms\n\`\`\`\n`
        : "";

  const readme = `# ${answers.projectName}

A Kyro CMS project.
${dbInstructions}
## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Admin Dashboard

Visit [http://localhost:4321/admin](http://localhost:4321/admin) to access the admin.

The first user to register will automatically be granted super admin privileges.

## Deploy to Cloudflare

Make sure you are logged in to Cloudflare, then run:

\`\`\`bash
npm run deploy:cloudflare
\`\`\`

The interactive wizard will guide you through selecting a database, bucket name,
and admin credentials. Everything is provisioned automatically.

For CI/CD pipelines (non-interactive):

\`\`\`bash
npm run deploy:cloudflare:ci
# or pass flags directly:
npx kyro deploy cloudflare -y -d d1 -n my-project -e admin@example.com
\`\`\`

## Documentation

Visit [https://kyro-cms.com](https://kyro-cms.com) for full documentation.
`;

  writeFileSync(join(projectDir, "README.md"), readme);

  const agentsMd = `# Kyro CMS Project — AI Agent Guidelines

This project is built using **Kyro CMS** packages installed from npm:
- \`@kyro-cms/core\`: Headless CMS engine & API handlers
- \`@kyro-cms/admin\`: React Admin Dashboard UI

Official Documentation: https://kyro-cms.com

---

## 🏗️ Configuration & Architecture

- **\`kyro.config.ts\`**: The single configuration file defining collections, fields, database adapters, auth, and storage settings.
- **\`src/pages/api/[...kyro].ts\`**: Auto-generated API route handler for REST, GraphQL, tRPC, and WebSocket endpoints.
- **\`http://localhost:4321/admin\`**: The Admin Dashboard URL.

---

## 🛠️ Common Commands

- **\`npm run dev\`**: Start the Astro & Kyro dev server
- **\`npm run build\`**: Build for production
`;

  writeFileSync(join(agentsDir, "AGENTS.md"), agentsMd);

  const envExample = `# Kyro CMS Configuration
# Copy this file to .env and fill in your values

NODE_ENV=development
APP_URL=http://localhost:4321

${answers.database === "sqlite"
      ? "# SQLite (local) - no additional config needed"
      : answers.database === "postgres"
        ? "# Database connection (PostgreSQL)\nDATABASE_URL=postgresql://user:password@localhost:5432/kyro_cms"
        : "# MongoDB connection\nMONGODB_URI=mongodb://localhost:27017/kyro_cms"
    }

# App secret (set once; on first run it's stored in the database and can be managed via admin UI)
APP_SECRET=your-secret-here

# Admin credentials (used for first-user bootstrap)
# KYRO_ADMIN_EMAIL=admin@example.com
# KYRO_ADMIN_PASSWORD=SecurePass123!
`;

  writeFileSync(join(projectDir, ".env.example"), envExample);

  if (adminCredentials) {
    const envFile = `# Kyro CMS Configuration
# Copy this file to .env and fill in your values

NODE_ENV=development
APP_URL=http://localhost:4321

${answers.database === "sqlite"
        ? "# SQLite (local) - no additional config needed"
        : answers.database === "postgres"
          ? "# Database connection (PostgreSQL)\nDATABASE_URL=postgresql://user:password@localhost:5432/kyro_cms"
          : "# MongoDB connection\nMONGODB_URI=mongodb://localhost:27017/kyro_cms"
      }

# App secret (auto-generated; stored in database on first run)
APP_SECRET=${generateAppSecret()}

# Admin credentials (used for first-user bootstrap)
KYRO_ADMIN_EMAIL=${adminCredentials.adminEmail}
KYRO_ADMIN_PASSWORD=${adminCredentials.adminPassword}
`;

    writeFileSync(join(projectDir, ".env"), envFile);
  }

  const mainCss = `@import "tailwindcss";

@source "./pages/**/*.{astro,html,js,jsx,ts,tsx}";
@source "./components/**/*.{astro,html,js,jsx,ts,tsx}";
@source "./layouts/**/*.{astro,html,js,jsx,ts,tsx}";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
`;

  writeFileSync(join(stylesDir, "main.css"), mainCss);

  const indexPage = `---
import "../styles/main.css";
const title = "${answers.projectName}";
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body
    class="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-100 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 text-stone-900 dark:text-stone-100 antialiased"
  >
    <div class="relative min-h-screen flex flex-col items-center justify-center px-4">
      <!-- Decorative background blurs -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-100/60 dark:bg-indigo-900/20 blur-3xl"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-100/60 dark:bg-indigo-900/20 blur-3xl"></div>
      </div>

      <main class="relative text-center max-w-lg">
        <!-- Badge -->
        <div class="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-500 dark:text-stone-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Powered by Kyro CMS
        </div>

        <!-- Title -->
        <h1 class="mb-4 text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-stone-900 to-stone-500 dark:from-white dark:to-stone-400 bg-clip-text text-transparent">
          {title}
        </h1>

        <!-- Tagline -->
        <p class="mb-10 text-lg sm:text-xl text-stone-500 dark:text-stone-400 leading-relaxed">
          Your content management system is ready. Start building something amazing.
        </p>

        <!-- Admin link -->
        <a
          href="/admin"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold text-sm hover:bg-stone-800 dark:hover:bg-stone-100 transition-all shadow-lg hover:shadow-xl active:scale-[0.97]"
        >
          Go to Admin Dashboard
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
        </a>
      </main>

      <!-- Footer -->
      <footer class="absolute bottom-8 text-xs text-stone-400 dark:text-stone-500">
        &copy; {new Date().getFullYear()} {title}
      </footer>
    </div>
  </body>
</html>
`;

  writeFileSync(join(pagesDir, "index.astro"), indexPage);

  // Deployment scripts
}
