import { setCatalog, type Catalog } from "smartfind";
import catalogJson from "../../data/catalog.json";

const catalog = catalogJson as Catalog;
let loaded = false;

/** Use the bundled catalog JSON (reliable in local + published hosts). */
export function ensureCatalog(): Catalog {
  if (!loaded) {
    setCatalog(catalog);
    loaded = true;
  }
  return catalog;
}
