import { describe, it, expect } from "vitest";
import { validateProjectName, validateEmail } from "../src/validators";

describe("validators", () => {
  describe("validateProjectName", () => {
    it("accepts valid project names", () => {
      expect(validateProjectName("my-app")).toBe(true);
      expect(validateProjectName("kyro-cms-project")).toBe(true);
      expect(validateProjectName("a1b2c3")).toBe(true);
    });

    it("rejects empty names", () => {
      expect(validateProjectName("")).toBe("Project name is required");
    });

    it("rejects  letters", () => {
      expect(validateProjectName("My-App")).toBe(
        "Use lowercase letters, numbers, and hyphens only",
      );
    });

    it("rejects special characters", () => {
      expect(validateProjectName("my_app")).toBe(
        "Use lowercase letters, numbers, and hyphens only",
      );
      expect(validateProjectName("my.app")).toBe(
        "Use lowercase letters, numbers, and hyphens only",
      );
    });

    it("rejects names that are too short", () => {
      expect(validateProjectName("a")).toBe(
        "Project name must be at least 2 characters",
      );
    });

    it("rejects names that are too long", () => {
      expect(validateProjectName("a".repeat(51))).toBe(
        "Project name must be less than 50 characters",
      );
    });

    it("rejects names starting with a number", () => {
      expect(validateProjectName("1-app")).toBe(
        "Project name cannot start with a number or hyphen",
      );
    });

    it("rejects names starting with a hyphen", () => {
      expect(validateProjectName("-app")).toBe(
        "Project name cannot start with a number or hyphen",
      );
    });

    it("rejects reserved names", () => {
      const reserved = [
        "dist",
        "build",
        "public",
        "src",
        "test",
        "tests",
      ];
      for (const name of reserved) {
        expect(validateProjectName(name)).toBe(`"${name}" is a reserved name`);
      }
    });
  });

  describe("validateEmail", () => {
    it("accepts valid emails", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("test.user@domain.co.uk")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(validateEmail("not-an-email")).toBe("Invalid email address");
      expect(validateEmail("@domain.com")).toBe("Invalid email address");
    });

    it("allows empty string (optional field)", () => {
      expect(validateEmail("")).toBe(true);
    });
  });
});
