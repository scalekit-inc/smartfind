import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog, CatalogEntry, SearchOptions } from "./types.js";
import { searchEntries } from "./search-core.js";

/** The catalog bundled with this package: data/ next to dist/. Apps that bundle this
 * package (e.g. Next.js) can load the file themselves and pass it to setCatalog(). */
const CATALOG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "catalog.json.gz");

let cached: Catalog | null = null;

function loadDefaultCatalog(): Catalog {
  if (cached) return cached;
  let gz: Buffer;
  try {
    gz = readFileSync(CATALOG_PATH);
  } catch (err) {
    throw new Error(`smartfind: bundled catalog not found at ${CATALOG_PATH}`, { cause: err });
  }
  cached = JSON.parse(gunzipSync(gz).toString("utf8")) as Catalog;
  return cached;
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
