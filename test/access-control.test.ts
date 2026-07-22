import { describe, it, expect } from "vitest";
import { checkCollectionAccess, checkGlobalAccess } from "../src/access/checker.js";

describe("Access Control System", () => {
  describe("checkCollectionAccess", () => {
    it("allows access when custom access function returns true", async () => {
      const config = {
        slug: "posts",
        access: {
          read: () => true,
        },
      };
      const result = await checkCollectionAccess(config, "read", {});
      expect(result.allowed).toBe(true);
    });

    it("denies access when custom access function returns false", async () => {
      const config = {
        slug: "posts",
        access: {
          read: () => false,
        },
      };
      const result = await checkCollectionAccess(config, "read", {});
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(403);
    });

    it("returns extraWhere clause when custom access function returns query object", async () => {
      const whereClause = { status: { equals: "published" } };
      const config = {
        slug: "posts",
        access: {
          read: () => whereClause,
        },
      };
      const result = await checkCollectionAccess(config, "read", {});
      expect(result.allowed).toBe(true);
      expect(result.extraWhere).toEqual(whereClause);
    });

    it("checks API key permissions correctly", async () => {
      const config = { slug: "posts" };

      const validApiKey = {
        permissions: ["posts:read", "posts:create"],
      };

      const readResult = await checkCollectionAccess(config, "read", { apiKey: validApiKey });
      expect(readResult.allowed).toBe(true);

      const deleteResult = await checkCollectionAccess(config, "delete", { apiKey: validApiKey });
      expect(deleteResult.allowed).toBe(false);
      expect(deleteResult.status).toBe(403);
    });

    it("allows default public access when enabled", async () => {
      const config = { slug: "posts" };
      const result = await checkCollectionAccess(
        config,
        "read",
        {},
        { enablePublicAccess: true, defaultAccess: "read" }
      );
      expect(result.allowed).toBe(true);
    });

    it("rejects unauthenticated requests when public access is disabled", async () => {
      const config = { slug: "posts" };
      const result = await checkCollectionAccess(
        config,
        "read",
        {},
        { enablePublicAccess: false, defaultAccess: "read" }
      );
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe("checkGlobalAccess", () => {
    it("allows global access when custom function returns true", async () => {
      const config = {
        slug: "header-settings",
        access: {
          read: () => true,
        },
      };
      const result = await checkGlobalAccess(config, "read", {});
      expect(result.allowed).toBe(true);
    });

    it("denies global access when custom function returns false", async () => {
      const config = {
        slug: "header-settings",
        access: {
          read: () => false,
        },
      };
      const result = await checkGlobalAccess(config, "read", {});
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(403);
    });
  });
});
