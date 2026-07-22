#!/usr/bin/env node
import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateDTS } from "../src/codegen.js";

async function main() {
  const args = process.argv.slice(2);

  const url = getArg(args, "--url");
  const apiKey = getArg(args, "--api-key");
  const output = getArg(args, "--output") || "kyro.generated.d.ts";

  if (!url || !apiKey) {
    console.error("");
    console.error("  kyro-codegen — Generate Kyro CMS type definitions");
    console.error("");
    console.error("  Usage:");
    console.error("    npx kyro-codegen --url <url> --api-key <key> [--output <path>]");
    console.error("");
    console.error("  Example:");
    console.error('    npx kyro-codegen --url http://localhost:4321/api --api-key kyro_abc123');
    console.error("");
    process.exit(1);
  }

  const schemaUrl = `${url.replace(/\/$/, "")}/kyro/schema`;

  let res: Response;
  try {
    res = await fetch(schemaUrl, {
      headers: { "x-api-key": apiKey },
    });
  } catch (err: any) {
    console.error(`[kyro-codegen] Failed to connect: ${err.message}`);
    process.exit(1);
  }

  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch {}
    console.error(`[kyro-codegen] Schema request failed (${res.status}): ${body?.error ?? res.statusText}`);
    process.exit(1);
  }

  let schema: any;
  try {
    schema = await res.json();
  } catch {
    console.error("[kyro-codegen] Invalid JSON response from schema endpoint");
    process.exit(1);
  }

  const dts = generateDTS(schema);
  const outPath = resolve(process.cwd(), output);
  writeFileSync(outPath, dts, "utf-8");

  const colCount = Object.keys(schema.collections ?? {}).length;
  const globalCount = Object.keys(schema.globals ?? {}).length;
}

function getArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

main().catch((err) => {
  console.error(`[kyro-codegen] Fatal error: ${err.message}`);
  process.exit(1);
});
