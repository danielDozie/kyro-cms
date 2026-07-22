import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { seedDefaultRoles } from "./database.js";

async function main() {


  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/kyro_cms";
  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(client);

  try {

    await seedDefaultRoles(db);

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
