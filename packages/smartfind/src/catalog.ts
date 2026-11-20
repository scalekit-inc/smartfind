import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog, CatalogEntry, SearchOptions } from "./types.js";
import { searchEntries } from "./search-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(here, "..", "data", "catalog.json");

let cached: Catalog | null = null;

function loadDefaultCatalog(): Catalog {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(catalogPath, "utf8")) as Catalog;
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
