import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setCatalog, type Catalog } from "smartfind";

let catalog: Catalog | null = null;

/**
 * Next bundles smartfind into the server code, so the package can't find its own data
 * file at runtime. Read it from one fixed path in this repo instead (also listed in
 * outputFileTracingIncludes in next.config.ts) and hand it to the package.
 */
export function ensureCatalog(): Catalog {
  if (!catalog) {
    const gz = readFileSync(join(process.cwd(), "packages", "smartfind", "data", "catalog.json.gz"));
    catalog = JSON.parse(gunzipSync(gz).toString("utf8")) as Catalog;
    setCatalog(catalog);
  }
  return catalog;
}
