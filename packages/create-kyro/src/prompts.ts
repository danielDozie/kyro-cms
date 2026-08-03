import prompts from "prompts";
import { parseArgs } from "node:util";
import { validateProjectName } from "./validators.js";

export interface Answers {
  projectName: string;
  database: "sqlite" | "postgres" | "mongodb";
  template: "minimal" | "starter" | "blog" | "ecommerce" | "kitchen-sink";
  adminEmail: string;
  targetDir?: string;
}

export function parseCliArgs(): Partial<Answers> & { nonInteractive?: boolean; targetDir?: string } {
  const rawArgs = process.argv.slice(2);
  const hasNonInteractiveFlag = rawArgs.some(a => a === '--non-interactive' || a === '-y' || a === '--yes');
  const isNonTTY = typeof process.stdout !== 'undefined' && typeof process.stdout.isTTY !== 'undefined' && !process.stdout.isTTY;

  let parsedValues: Record<string, any> = {};
  let targetDir: string | undefined = undefined;

  try {
    const { values, positionals } = parseArgs({
      args: rawArgs,
      options: {
        template: { type: "string" },
        database: { type: "string" },
        "admin-email": { type: "string" },
        yes: { type: "boolean", short: "y" },
        "non-interactive": { type: "boolean" },
      },
      allowPositionals: true,
      strict: false,
    });
    parsedValues = values || {};
    targetDir = positionals[0];
  } catch {
    for (const arg of rawArgs) {
      if (arg.startsWith('--template=')) parsedValues.template = arg.split('=')[1];
      if (arg.startsWith('--database=')) parsedValues.database = arg.split('=')[1];
      if (arg.startsWith('--admin-email=')) parsedValues['admin-email'] = arg.split('=')[1];
      if (!arg.startsWith('-') && !targetDir) targetDir = arg;
    }
  }

  const rawName = targetDir ? targetDir.split(/[/\\]/).filter(Boolean).pop() : undefined;
  const projectName = rawName || "my-kyro-app";

  return {
    projectName,
    targetDir,
    ...(parsedValues.template ? { template: parsedValues.template as Answers["template"] } : {}),
    ...(parsedValues.database ? { database: parsedValues.database as Answers["database"] } : {}),
    ...(parsedValues["admin-email"] ? { adminEmail: parsedValues["admin-email"] as string } : {}),
    nonInteractive: Boolean(hasNonInteractiveFlag || isNonTTY || parsedValues.yes || parsedValues["non-interactive"]),
  };
}

export async function promptUser(): Promise<Answers> {
  const cliArgs = parseCliArgs();

  // If non-interactive flag passed or required options supplied via CLI
  if (cliArgs.nonInteractive || (cliArgs.targetDir && cliArgs.template && cliArgs.database)) {
    const projectName = cliArgs.projectName || "my-kyro-app";
    return {
      projectName,
      targetDir: cliArgs.targetDir,
      template: cliArgs.template || "minimal",
      database: cliArgs.database || "sqlite",
      adminEmail: cliArgs.adminEmail || `admin@${projectName}.local`,
    };
  }
  const response = await prompts(
    [
      {
        type: "text",
        name: "projectName",
        message: "Project name:",
        initial: "my-kyro-app",
        validate: validateProjectName,
      },
      {
        type: "select",
        name: "database",
        message: "Database:",
        hint: " ",
        choices: [
          {
            title: "SQLite (local-first, zero config)",
            description:
              "Best for development and small projects. No setup required.",
            value: "sqlite",
          },
          {
            title: "PostgreSQL",
            description: "Recommended for production. Robust and scalable.",
            value: "postgres",
          },
          {
            title: "MongoDB",
            description: "Best for flexible, document-based schemas.",
            value: "mongodb",
          },
        ],
      },
      {
        type: "select",
        name: "template",
        message: "Starting template:",
        hint: " ",
        initial: 0,
        choices: [
          {
            title: "Minimal",
            description:
              "Single Posts collection — just title & content. Perfect for getting started fast.",
            value: "minimal",
          },
          {
            title: "Starter",
            description:
              "Pages, Posts, Categories, Menu + core settings. Great for blogs and small sites.",
            value: "starter",
          },
          {
            title: "Blog",
            description:
              "Posts, categories, media library + all settings. Full blog setup.",
            value: "blog",
          },
          {
            title: "E-commerce",
            description:
              "Products, orders, customers, coupons + all settings. Online store ready.",
            value: "ecommerce",
          },
          {
            title: "Kitchen Sink",
            description:
              "Everything: all collections + all settings. Maximum feature set.",
            value: "kitchen-sink",
          },
        ],
      },
      {
        type: "text",
        name: "adminEmail",
        message: "Admin email:",
        initial: (prev, values) => `admin@${values.projectName}.local`,
      },
    ],
    {
      onCancel: () => {
        process.exit(1);
      },
    },
  );

  return response as Answers;
}
