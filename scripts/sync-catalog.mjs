#!/usr/bin/env node
/** Expand packages/smartfind/data/catalog.json.gz → local catalog.json copies. */
import { gunzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gz = join(root, "packages/smartfind/data/catalog.json.gz");
const plain = join(root, "packages/smartfind/data/catalog.json");

let json;
if (existsSync(gz)) {
  json = gunzipSync(readFileSync(gz)).toString("utf8");
  writeFileSync(plain, json);
} else if (existsSync(plain)) {
  json = readFileSync(plain, "utf8");
} else {
  console.error("No catalog.json.gz or catalog.json found under packages/smartfind/data");
  process.exit(1);
}

const gzBytes = existsSync(gz) ? readFileSync(gz) : null;

for (const dir of [join(root, "data"), join(root, "public/data")]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "catalog.json"), json);
  // Hosted Cursor apps resolve /var/task/data/catalog.json.gz more reliably
  // when the gzipped file also lives at the repo root data/ path.
  if (gzBytes) writeFileSync(join(dir, "catalog.json.gz"), gzBytes);
}

const catalog = JSON.parse(json);
console.log(`Synced catalog (${catalog.count ?? catalog.entries?.length ?? "?"} entries)`);
