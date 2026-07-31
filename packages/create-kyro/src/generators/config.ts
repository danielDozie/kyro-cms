import type { Answers } from "../prompts.js";

export function generateKyroConfig(answers: Answers): string {
  const imports: string[] = [
    "import { defineKyroConfig } from '@kyro-cms/core';",
    "import { templateCollections } from '@kyro-cms/core/templates';",
  ];

  if (answers.database === "sqlite") {
    imports.push("import { createLocalAdapter } from '@kyro-cms/core';");
  } else if (answers.database === "postgres") {
    imports.push("import { createDrizzleAdapter } from '@kyro-cms/core';");
  } else if (answers.database === "mongodb") {
    imports.push("import { createMongoDBAdapter } from '@kyro-cms/core';");
  }

  const adapterLines: string[] = [];
  if (answers.database === "sqlite") {
    adapterLines.push(`  adapter: createLocalAdapter({ path: './data.db' }),`);
  } else if (answers.database === "postgres") {
    adapterLines.push(`  adapter: createDrizzleAdapter({`);
    adapterLines.push(`    connectionString: process.env.DATABASE_URL,`);
    adapterLines.push(`  }),`);
  } else if (answers.database === "mongodb") {
    adapterLines.push(`  adapter: createMongoDBAdapter({`);
    adapterLines.push(`    connectionString: process.env.MONGODB_URI,`);
    adapterLines.push(`  }),`);
  }

  let templateGlobals = "";
  switch (answers.template) {
    case "minimal":
    case "starter":
    case "blog":
      templateGlobals = "import { coreGlobalSettings } from '@kyro-cms/core/templates';";
      break;
    case "ecommerce":
    case "kitchen-sink":
      templateGlobals = "import { allGlobalSettings } from '@kyro-cms/core/templates';";
      break;
  }

  if (templateGlobals) imports.push(templateGlobals);

  const collectionKey =
    answers.template === "kitchen-sink"
      ? '["kitchen-sink"]'
      : `.${answers.template}`;

  const collectionsConfig = `  collections: templateCollections${collectionKey},`;

  let globalsConfig = "";
  if (answers.template === "minimal" || answers.template === "starter" || answers.template === "blog") {
    globalsConfig = `  globals: coreGlobalSettings,`;
  } else if (answers.template === "ecommerce" || answers.template === "kitchen-sink") {
    globalsConfig = `  globals: allGlobalSettings,`;
  }

  return `${imports.join("\n")}

export default defineKyroConfig({
${adapterLines.join("\n")}
${collectionsConfig}
${globalsConfig}
  auth: {
    secret: process.env.APP_SECRET,
  },
});`;
}
