import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createLocalStorage } from "../src/storage/local.js";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("Storage Adapters", () => {
  describe("Local Storage Provider", () => {
    let tempDir: string;
    let storage: ReturnType<typeof createLocalStorage>;

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "kyro-storage-test-"));
      storage = createLocalStorage({
        uploadDir: tempDir,
        baseUrl: "/uploads",
      });
    });

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("uploads a text file and returns metadata", async () => {
      const file = new File(["Hello Kyro Storage"], "sample.txt", {
        type: "text/plain",
      });

      const uploaded = await storage.upload!(file, { filename: "sample.txt" });
      expect(uploaded).toBeDefined();
      expect(uploaded.filename).toBe("sample.txt");
      expect(uploaded.originalName).toBe("sample.txt");
      expect(uploaded.url).toBe("/uploads/sample.txt");
      expect(uploaded.provider).toBe("local");

      const exists = await storage.exists!(uploaded.url);
      expect(exists).toBe(true);
    });

    it("creates, checks, and lists folder contents", async () => {
      await storage.createFolder!("docs");

      const file = new File(["PDF content"], "manual.pdf", {
        type: "application/pdf",
      });

      const uploaded = await storage.upload!(file, { folder: "docs", filename: "manual.pdf" });
      expect(uploaded.url).toBe("/uploads/docs/manual.pdf");

      const list = await storage.list!("docs");
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((item) => item.filename === "manual.pdf")).toBe(true);
    });

    it("deletes a file and confirms non-existence", async () => {
      const file = new File(["Delete Me"], "to-delete.txt", {
        type: "text/plain",
      });

      const uploaded = await storage.upload!(file, { filename: "to-delete.txt" });
      expect(await storage.exists!(uploaded.url)).toBe(true);

      await storage.delete!(uploaded.url);
      expect(await storage.exists!(uploaded.url)).toBe(false);
    });
  });
});
