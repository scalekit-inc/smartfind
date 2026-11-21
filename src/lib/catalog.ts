import { gunzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setCatalog, type Catalog } from "smartfind";

let catalog: Catalog | null = null;
let loaded = false;

function loadFromDisk(): Catalog {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "data/catalog.json.gz"),
    join(cwd, "packages/smartfind/data/catalog.json.gz"),
    join(cwd, "data/catalog.json"),
    join(cwd, "packages/smartfind/data/catalog.json"),
    join(cwd, "node_modules/smartfind/data/catalog.json.gz"),
    join(cwd, "node_modules/smartfind/data/catalog.json"),
  ];

  const tried: string[] = [];
  for (const path of candidates) {
    tried.push(path);
    if (!existsSync(path)) continue;
    try {
      if (path.endsWith(".gz")) {
        const raw = gunzipSync(readFileSync(path)).toString("utf8");
        return JSON.parse(raw) as Catalog;
      }
      return JSON.parse(readFileSync(path, "utf8")) as Catalog;
    } catch (err) {
      console.warn(`ensureCatalog: failed reading ${path}`, err);
    }
  }

  throw new Error(
    `Catalog file missing in published app. Tried:\n${tried.map((p) => `  - ${p}`).join("\n")}`,
  );
}

/** Load catalog from known workspace paths (works under Cursor /var/task hosting). */
export function ensureCatalog(): Catalog {
  if (!loaded) {
    catalog = loadFromDisk();
    setCatalog(catalog);
    loaded = true;
  }
  return catalog as Catalog;
}
