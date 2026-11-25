import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { DrizzleAdapter } from "../src/database/drizzle/adapter.js";

describe("Drizzle protected recovery persistence", () => {
  it("keeps recovery snapshots outside ordinary retention and autosave slots", async () => {
    const sqlite = new DatabaseSync(":memory:");
    // D1-compatible query transport backed by real isolated SQLite, exercising generated SQL.
    const transport = {
      prepare(query: string) {
        const stmt = sqlite.prepare(query);
        return {
          all: async () => ({ results: stmt.all() }),
          bind: (...params: any[]) => ({ all: async () => ({ results: stmt.all(...params) }) }),
        };
      },
    };
    const adapter = new DrizzleAdapter({ type: "sqlite", client: transport });
    (adapter as any).collections.set("pages", { slug: "pages", fields: [], versions: { drafts: true, maxPerDoc: 1 } });
    try {
      const recovery = await adapter.createVersion({
        collection: "pages",
        documentId: "page",
        status: "archived",
        recovery: true,
        data: { content: [{ id: "layout", blockType: "container" }] },
      });
      const replacement = await adapter.createVersion({ collection: "pages", documentId: "page", status: "archived", recovery: true, data: { content: [{ id: "layout", blockType: "container" }], title: "Latest snapshot" } });
      expect(replacement.id).toBe(recovery.id);
      for (let i = 0; i < 5; i++)
        await adapter.createVersion({
          collection: "pages",
          documentId: "page",
          status: "draft",
          data: { title: `Draft ${i}` },
        });
      await adapter.updateLatestVersion({
        collection: "pages",
        documentId: "page",
        status: "draft",
        data: { title: "Autosave" },
      });
      const snapshot = await adapter.findVersionByID({ collection: "pages", versionId: recovery.id });
      expect(snapshot.recovery).toBe(1);
      expect(snapshot.data.title).toBe("Latest snapshot");
      expect(snapshot.data.content[0].id).toBe("layout");
      const history = await adapter.findVersions({ collection: "pages", documentId: "page", recoveryOnly: true });
      expect(history.docs.map((v: any) => v.id)).toEqual([recovery.id]);
      expect(
        sqlite.prepare("SELECT count(*) AS count FROM kyro_versions WHERE recovery = 0 AND autosave = 0").get()?.count,
      ).toBe(1);
    } finally {
      sqlite.close();
    }
  });
});
