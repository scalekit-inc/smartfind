import { getCatalog, setCatalog, type Catalog } from "smartfind";

let catalog: Catalog | null = null;
let loaded = false;

/** Load via the package (supports catalog.json.gz) — do not import the giant JSON. */
export function ensureCatalog(): Catalog {
  if (!loaded) {
    catalog = getCatalog();
    setCatalog(catalog);
    loaded = true;
  }
  return catalog as Catalog;
}
