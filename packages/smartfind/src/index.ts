export type {
  Catalog,
  CatalogEntry,
  DiscoverResult,
  Persona,
  ScalekitSmartConnection,
  SearchOptions,
  SmartConfiguration,
  SmartSettings,
  Vendor,
} from "./types.js";

export {
  getByFhirBase,
  getById,
  getCatalog,
  searchCatalog,
  setCatalog,
} from "./catalog.js";

export { searchEntries } from "./search-core.js";

export {
  enrichFhirBase,
  fetchSmartConfiguration,
  fhirServerDomain,
  smartConfigurationUrl,
  toSmartSettings,
} from "./enrich.js";

export {
  assertSafeFhirBaseUrl,
  normalizeFhirBase,
  parseHttpsFhirBase,
} from "./ssrf.js";

export { toScalekitConnection } from "./scalekit.js";

export {
  discoverByFhirBase,
  discoverById,
  discoverSearch,
} from "./discover.js";
