import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export function getPackageManager(): "npm" | "pnpm" | "yarn" | "bun" {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock")))
    return "bun";
  return "npm";
}

export function autoInstall(packages: string[]) {
  const pm = getPackageManager();
  console.log(`\n📦 [Kyro CMS] Auto-installing missing database drivers: ${packages.join(", ")}...`);
  try {
    const installCmd = pm === "npm" ? "npm install" : `${pm} add`;
    execSync(`${installCmd} ${packages.join(" ")}`, { stdio: "inherit" });
    console.log(`✅ [Kyro CMS] Successfully installed drivers!\n`);
  } catch (error) {
    console.error(
      `❌ [Kyro CMS] Failed to auto-install drivers. Please run manually: ${pm === "npm" ? "npm install" : `${pm} add`} ${packages.join(" ")}`
    );
    throw error;
  }
}
