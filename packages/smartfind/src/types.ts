export type Vendor =
  | "epic"
  | "oracle-health"
  | "advancedmd"
  | "athena"
  | "eclinicalworks"
  | "office-ally"
  | "veradigm"
  | "nextgen"
  | "meditech"
  | "pointclickcare"
  | "practice-fusion"
  | "greenway"
  | "elation"
  | "darena"
  | "smart-health-it"
  | "other";

export type Persona = "provider" | "patient" | "both";

export interface CatalogEntry {
  id: string;
  name: string;
  aliases: string[];
  vendor: Vendor | string;
  persona: Persona;
  fhirBase: string;
  state?: string | null;
  city?: string | null;
  source: string;
}

export interface Catalog {
  version: number;
  generatedAt: string;
  sources: string[];
  count: number;
  entries: CatalogEntry[];
}

export interface SearchOptions {
  query?: string;
  vendor?: string;
  persona?: Persona | "any";
  state?: string;
  limit?: number;
}

export interface SmartConfiguration {
  issuer?: string;
  jwks_uri?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
  management_endpoint?: string;
  grant_types_supported?: string[];
  scopes_supported?: string[];
  response_types_supported?: string[];
  capabilities?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  [key: string]: unknown;
}

export interface SmartSettings {
  name?: string;
  vendor?: string;
  persona?: Persona;
  fhirBase: string;
  audience: string;
  fhirServerDomain: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  registrationEndpoint?: string;
  jwksUri?: string;
  scopesSupported?: string[];
  capabilities?: string[];
  grantTypesSupported?: string[];
  codeChallengeMethodsSupported?: string[];
  tokenEndpointAuthMethodsSupported?: string[];
  smartConfigurationUrl: string;
  raw?: SmartConfiguration;
  fetchedAt: string;
}

/** Fields that map 1:1 to Scalekit's Custom SMART on FHIR connection form. */
export interface ScalekitSmartConnection {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  audience: string;
  fhirServerDomain: string;
  suggestedScopes: string[];
  notes: string[];
}

export interface DiscoverResult {
  entry?: CatalogEntry;
  settings: SmartSettings;
  scalekit: ScalekitSmartConnection;
}
