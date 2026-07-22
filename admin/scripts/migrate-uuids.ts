import { DatabaseSync } from "node:sqlite";
import path from "path";
import { randomBytes } from "crypto";

function getContentDbPath(): string {
  return (
    process.env.CONTENT_DB_PATH ||
    path.join(process.cwd(), "data", "content.db")
  );
}

function isIntegerId(id: string): boolean {
  return /^\d+$/.test(id);
}

function generateUuid(): string {
  return randomBytes(16).toString("hex");
}

function migrate() {
  const dbPath = getContentDbPath();
  console.log(`Opening database: ${dbPath}`);

  const db = new DatabaseSync(dbPath);

  // Get all collections
  const collections = db
    .prepare("SELECT DISTINCT collection FROM documents")
    .all() as { collection: string }[];
  console.log(`Found ${collections.length} collections`);

  let totalMigrated = 0;

  for (const { collection } of collections) {
    // Find all documents with integer IDs
    const docs = db
      .prepare(
        "SELECT id, data FROM documents WHERE collection = ? AND id LIKE ?",
      )
      .all(collection, `${collection}-%`) as { id: string; data: string }[];

    const intDocs = docs.filter((d) =>
      isIntegerId(d.id.replace(`${collection}-`, "")),
    );

    console.log(
      `Collection '${collection}': ${intDocs.length} documents to migrate`,
    );

    for (const doc of intDocs) {
      const newId = generateUuid();
      const data = JSON.parse(doc.data);

      console.log(`  Migrating: ${doc.id} -> ${newId}`);

      // Insert new document with UUID
      db.prepare(
        "INSERT INTO documents (id, collection, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(
        newId,
        collection,
        JSON.stringify(data),
        data.createdAt || new Date().toISOString(),
        data.updatedAt || new Date().toISOString(),
      );

      // Delete old document
      db.prepare("DELETE FROM documents WHERE id = ?").run(doc.id);

      totalMigrated++;
    }
  }

  console.log(`Migration complete. Total documents migrated: ${totalMigrated}`);
  db.close();
}

migrate();
