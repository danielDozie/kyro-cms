import { describe, it, expect } from "vitest";
import type { Answers } from "../src/prompts";
import { generateKyroConfig } from "../src/generators/config";
import { generateAstroConfig } from "../src/generators/astro";
import {
  generatePackageJson,
  formatPackageJson,
} from "../src/generators/packagejson";

const baseAnswers: Answers = {
  projectName: "test-project",
  database: "sqlite",
  template: "blog",
  adminEmail: "admin@test-project.local",
};

const allDatabases = ["sqlite", "postgres", "mongodb"] as const;
const allTemplates = ["minimal", "starter", "blog", "ecommerce", "kitchen-sink"] as const;

describe("generators", () => {
  describe("generateKyroConfig", () => {
    it("generates config with SQLite adapter", () => {
      const config = generateKyroConfig(baseAnswers);
      expect(config).toContain("createLocalAdapter");
      expect(config).toContain("./data.db");
    });

    it("generates config with PostgreSQL adapter", () => {
      const answers = { ...baseAnswers, database: "postgres" as const };
      const config = generateKyroConfig(answers);
      expect(config).toContain("createDrizzleAdapter");
      expect(config).toContain("DATABASE_URL");
    });

    it("generates config with MongoDB adapter", () => {
      const answers = { ...baseAnswers, database: "mongodb" as const };
      const config = generateKyroConfig(answers);
      expect(config).toContain("createMongoDBAdapter");
      expect(config).toContain("MONGODB_URI");
    });

    it("includes auth with app secret", () => {
      const config = generateKyroConfig(baseAnswers);
      expect(config).toContain("APP_SECRET");
    });

    it("never generates mysql adapter", () => {
      const config = generateKyroConfig(baseAnswers);
      expect(config).not.toContain("mysql");
      expect(config).not.toContain("MySQL");
    });

    it("imports correct template collections", () => {
      const minimal = generateKyroConfig({
        ...baseAnswers,
        template: "minimal",
      });
      expect(minimal).toContain("templateCollections.minimal");
      expect(minimal).not.toContain("templateCollections.starter");

      const starter = generateKyroConfig({
        ...baseAnswers,
        template: "starter",
      });
      expect(starter).toContain("templateCollections.starter");

      const blog = generateKyroConfig({ ...baseAnswers, template: "blog" });
      expect(blog).toContain("templateCollections.blog");

      const ecommerce = generateKyroConfig({
        ...baseAnswers,
        template: "ecommerce",
      });
      expect(ecommerce).toContain("templateCollections.ecommerce");

      const kitchen = generateKyroConfig({
        ...baseAnswers,
        template: "kitchen-sink",
      });
      expect(kitchen).toContain('templateCollections["kitchen-sink"]');
    });

    it("imports settings globals per template", () => {
      const minimal = generateKyroConfig({ ...baseAnswers, template: "minimal" });
      expect(minimal).toContain("coreGlobalSettings");

      const starter = generateKyroConfig({ ...baseAnswers, template: "starter" });
      expect(starter).toContain("coreGlobalSettings");

      const blog = generateKyroConfig({ ...baseAnswers, template: "blog" });
      expect(blog).toContain("coreGlobalSettings");

      const ecommerce = generateKyroConfig({ ...baseAnswers, template: "ecommerce" });
      expect(ecommerce).toContain("allGlobalSettings");
      expect(ecommerce).not.toContain("ecommerceSettingsGlobals");

      const kitchen = generateKyroConfig({ ...baseAnswers, template: "kitchen-sink" });
      expect(kitchen).toContain("allGlobalSettings");
    });

    it("uses project name in config", () => {
      const config = generateKyroConfig(baseAnswers);
      expect(config).toContain("name: 'test-project'");
    });

    it("uses correct adapter import for each database", () => {
      for (const db of allDatabases) {
        const config = generateKyroConfig({ ...baseAnswers, database: db });
        if (db === "sqlite") {
          expect(config).toContain("createLocalAdapter");
        } else if (db === "postgres") {
          expect(config).toContain("createDrizzleAdapter");
        } else {
          expect(config).toContain("createMongoDBAdapter");
        }
      }
    });

    it("uses correct template imports path", () => {
      const config = generateKyroConfig(baseAnswers);
      expect(config).toContain("import { templateCollections } from '@kyro-cms/core/templates'");
      expect(config).toContain("defineKyroConfig");
    });
  });

  describe("generateAstroConfig", () => {
    it("includes kyro integration from core", () => {
      const config = generateAstroConfig(baseAnswers);
      expect(config).toContain("import { kyro } from '@kyro-cms/core'");
      expect(config).toContain("kyro(");
    });

    it("includes kyroAdmin integration from admin", () => {
      const config = generateAstroConfig(baseAnswers);
      expect(config).toContain("@kyro-cms/admin");
      expect(config).toContain("kyroAdmin(");
    });

    it("sets correct server port", () => {
      const config = generateAstroConfig(baseAnswers);
      expect(config).toContain("port: 4321");
    });

    it("enables SSR server output", () => {
      const config = generateAstroConfig(baseAnswers);
      expect(config).toContain("output: 'server'");
    });

    it("configures admin and api paths", () => {
      const config = generateAstroConfig(baseAnswers);
      expect(config).toContain("/admin");
      expect(config).toContain("/api");
    });

    it("includes react integration for admin UI", () => {
      const config = generateAstroConfig(baseAnswers);
      expect(config).toContain("@astrojs/react");
    });

    it("includes tailwind vite plugin", () => {
      const config = generateAstroConfig(baseAnswers);
      expect(config).toContain("@tailwindcss/vite");
      expect(config).toContain("tailwind()");
    });
  });

  describe("generatePackageJson", () => {
    it("includes core dependency", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.dependencies["@kyro-cms/core"]).toBeDefined();
    });

    it("includes admin dependency", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.dependencies["@kyro-cms/admin"]).toBeDefined();
    });

    it("includes astro dependency", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.dependencies["astro"]).toBeDefined();
    });

    it("has correct project name", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.name).toBe("test-project");
    });

    it("formats as valid JSON string", () => {
      const pkg = generatePackageJson(baseAnswers);
      const formatted = formatPackageJson(pkg);
      expect(() => JSON.parse(formatted)).not.toThrow();
    });

    it("is private by default", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.private).toBe(true);
    });

    it("has type module", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.type).toBe("module");
    });

    it("includes SQLite scripts for SQLite", () => {
      const pkg = generatePackageJson({ ...baseAnswers, database: "sqlite" });
      expect(pkg.scripts["db:generate"]).toBeDefined();
      expect(pkg.scripts["db:push"]).toBeDefined();
      expect(pkg.scripts["db:studio"]).toBeDefined();
    });

    it("omits SQLite scripts for non-SQLite databases", () => {
      for (const db of ["postgres", "mongodb"] as const) {
        const pkg = generatePackageJson({ ...baseAnswers, database: db });
        expect(pkg.scripts["db:generate"]).toBeUndefined();
        expect(pkg.scripts["db:push"]).toBeUndefined();
        expect(pkg.scripts["db:studio"]).toBeUndefined();
      }
    });

    it("never includes old dependencies", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.dependencies["react"]).toBeDefined();
      expect(pkg.dependencies["react-dom"]).toBeDefined();
      expect(pkg.dependencies["lucide-react"]).toBeUndefined();
      expect(pkg.dependencies["mysql2"]).toBeUndefined();
    });

    it("includes react type definitions", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.devDependencies["@types/react"]).toBeDefined();
      expect(pkg.devDependencies["@types/react-dom"]).toBeDefined();
    });

    it("includes tailwindcss and @tailwindcss/vite", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.dependencies["tailwindcss"]).toBeDefined();
      expect(pkg.dependencies["@tailwindcss/vite"]).toBeDefined();
    });

    it("includes vite override for Astro compatibility", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.overrides).toBeDefined();
      expect(pkg.overrides!["vite"]).toBe("^7");
    });

    it("never includes manual auth bootstrap script", () => {
      const pkg = generatePackageJson(baseAnswers);
      expect(pkg.scripts["db:bootstrap"]).toBeUndefined();
    });
  });
});
