import type { Config } from "drizzle-kit";

export default {
  schema: "./src/database/drizzle/schema/**/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/kyro_cms",
  },
  verbose: true,
  strict: true,
} satisfies Config;
