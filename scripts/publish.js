#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";

const PACKAGES = [
  { name: "@kyro-cms/core", path: "." },
  { name: "@kyro-cms/admin", path: "admin" },
  { name: "create-kyro", path: "packages/create-kyro" },
  { name: "@kyro-cms/ai", path: "packages/kyro-ai" },
  { name: "@kyro-cms/connect", path: "packages/kyro-connect" },
  { name: "kyro-field-locations", path: "packages/kyro-field-locations" },
  { name: "@kyro-cms/kyro-rich-text-react", path: "packages/kyro-rich-text-react" },
];

function checkNpmAuth() {
  try {
    const user = execSync("npm whoami", { encoding: "utf8" }).trim();
    console.log(`\x1b[32m✔ Authenticated as npm user: ${user}\x1b[0m\n`);
    return true;
  } catch {
    console.error(`\x1b[31m✖ You are not logged into npm!\x1b[0m`);
    console.log(`Please run \x1b[36mnpm login\x1b[0m first, then re-run this script.\n`);
    process.exit(1);
  }
}

function getPackageInfo(pkgPath) {
  const file = path.join(pkgPath, "package.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return { name: data.name, version: data.version };
}

function isVersionPublished(name, version) {
  try {
    const output = execSync(`npm view ${name}@${version} version`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return output === version;
  } catch {
    return false;
  }
}

function runCommand(cmd, cwd = ".") {
  console.log(`\x1b[34m[EXEC]\x1b[0m \x1b[1m${cmd}\x1b[0m in ./${cwd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function publishPackage(pkg, isDryRun = false) {
  const { name, version } = getPackageInfo(pkg.path);
  console.log(`\x1b[35m=== Processing ${name} v${version} (${pkg.path}) ===\x1b[0m`);

  // Check if version is already published on npm
  if (!isDryRun && isVersionPublished(name, version)) {
    console.log(`\x1b[33m⏭  ${name}@${version} is already published on npm. Skipping.\x1b[0m\n`);
    return;
  }

  try {
    // Rebuild
    runCommand("pnpm run build", pkg.path);

    // Publish
    const flag = isDryRun ? "--dry-run --no-git-checks" : "--no-git-checks";
    runCommand(`pnpm publish --access public ${flag}`, pkg.path);
    console.log(`\x1b[32m✔ Successfully published ${name}@${version}\x1b[0m\n`);
  } catch (error) {
    const message = error.message || String(error);
    if (message.includes("previously published") || message.includes("cannot publish over")) {
      console.log(`\x1b[33m⏭  ${name}@${version} is already published on npm. Skipping.\x1b[0m\n`);
    } else {
      console.error(`\x1b[31m✖ Error publishing ${name}: ${message}\x1b[0m\n`);
    }
  }
}

async function main() {
  console.log(`\n\x1b[1m🚀 Kyro CMS Package Publisher\x1b[0m\n`);

  // Step 1: Verify auth
  checkNpmAuth();

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log(`\x1b[33m⚡ Running in DRY RUN mode (no packages will actually be published to npm)\x1b[0m\n`);
  }

  // Step 2: Interactive menu
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Select packages to publish:\n");
  console.log("  \x1b[36m[0]\x1b[0m Publish ALL Packages (7 packages)");
  PACKAGES.forEach((pkg, index) => {
    const { name, version } = getPackageInfo(pkg.path);
    console.log(`  \x1b[36m[${index + 1}]\x1b[0m ${name}@${version} \x1b[90m(./${pkg.path})\x1b[0m`);
  });
  console.log("  \x1b[31m[q]\x1b[0m Quit\n");

  rl.question("Enter choice (0-7 or q): ", (answer) => {
    rl.close();
    const choice = answer.trim().toLowerCase();

    if (choice === "q") {
      console.log("Aborted.");
      process.exit(0);
    }

    if (choice === "0") {
      console.log("\n\x1b[33mProcessing ALL packages...\x1b[0m\n");
      PACKAGES.forEach((pkg) => publishPackage(pkg, isDryRun));
      console.log(`\x1b[32m🎉 All packages processed!\x1b[0m\n`);
    } else {
      const index = parseInt(choice, 10) - 1;
      if (index >= 0 && index < PACKAGES.length) {
        publishPackage(PACKAGES[index], isDryRun);
        console.log(`\x1b[32m🎉 ${PACKAGES[index].name} processed!\x1b[0m\n`);
      } else {
        console.error("\x1b[31mInvalid selection.\x1b[0m");
        process.exit(1);
      }
    }
  });
}

main();
