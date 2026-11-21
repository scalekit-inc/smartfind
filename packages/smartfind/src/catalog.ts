import { gunzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog, CatalogEntry, SearchOptions } from "./types.js";
import { searchEntries } from "./search-core.js";

let cached: Catalog | null = null;

function candidateCatalogPaths(): string[] {
  const paths: string[] = [];
  const push = (p: string) => {
    if (p && !paths.includes(p)) paths.push(p);
  };

  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // dist/catalog.js → ../data/
    push(join(here, "..", "data", "catalog.json.gz"));
    push(join(here, "..", "data", "catalog.json"));
    // Sometimes bundled next to source
    push(join(here, "data", "catalog.json.gz"));
    push(join(here, "data", "catalog.json"));
  } catch {
    // import.meta.url unavailable in some bundles
  }

  const cwd = typeof process !== "undefined" ? process.cwd() : "";
  if (cwd) {
    push(join(cwd, "packages/smartfind/data/catalog.json.gz"));
    push(join(cwd, "packages/smartfind/data/catalog.json"));
    push(join(cwd, "data/catalog.json.gz"));
    push(join(cwd, "data/catalog.json"));
    push(join(cwd, "node_modules/smartfind/data/catalog.json.gz"));
    push(join(cwd, "node_modules/smartfind/data/catalog.json"));
  }

  return paths;
}

function loadFromPath(path: string): Catalog {
  if (path.endsWith(".gz")) {
    const raw = gunzipSync(readFileSync(path)).toString("utf8");
    return JSON.parse(raw) as Catalog;
  }
  return JSON.parse(readFileSync(path, "utf8")) as Catalog;
}

function loadDefaultCatalog(): Catalog {
  if (cached) return cached;

  const tried: string[] = [];
  for (const path of candidateCatalogPaths()) {
    tried.push(path);
    if (!existsSync(path)) continue;
    try {
      cached = loadFromPath(path);
      return cached;
    } catch (err) {
      // try next candidate
      console.warn(`smartfind: failed to load catalog from ${path}:`, err);
    }
  }

  throw new Error(
    `smartfind catalog not found. Tried:\n${tried.map((p) => `  - ${p}`).join("\n")}`,
  );
}

export function getCatalog(): Catalog {
  return loadDefaultCatalog();
}

export function setCatalog(catalog: Catalog): void {
  cached = catalog;
}

export function searchCatalog(options: SearchOptions = {}): CatalogEntry[] {
  return searchEntries(getCatalog(), options);
}

export function getById(id: string): CatalogEntry | undefined {
  return getCatalog().entries.find((e) => e.id === id);
}

export function getByFhirBase(fhirBase: string): CatalogEntry | undefined {
  const needle = fhirBase.replace(/\/+$/, "").toLowerCase();
  return getCatalog().entries.find(
    (e) => e.fhirBase.replace(/\/+$/, "").toLowerCase() === needle,
  );
}
