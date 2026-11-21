import { createRequire } from "node:module";
import { setCatalog, type Catalog } from "smartfind";

const require = createRequire(import.meta.url);

let catalog: Catalog | null = null;
let loaded = false;

/** Load the packaged catalog at runtime (avoids bundling a 40MB+ JSON into Next). */
export function ensureCatalog(): Catalog {
  if (!loaded) {
    // Resolves to packages/smartfind/data/catalog.json via the workspace package export.
    catalog = require("smartfind/catalog.json") as Catalog;
    setCatalog(catalog);
    loaded = true;
  }
  return catalog as Catalog;
}
