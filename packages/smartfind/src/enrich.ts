import { GuardedFetchError, guardedFetch } from "guarded-fetch";
import type { CatalogEntry, SmartConfiguration, SmartSettings } from "./types.js";
import { normalizeFhirBase } from "./ssrf.js";

/** Default time limit for one discovery request; pass your own `signal` to override. */
const DEFAULT_TIMEOUT_MS = 15_000;

export function smartConfigurationUrl(fhirBase: string): string {
  return `${fhirBase.replace(/\/+$/, "")}/.well-known/smart-configuration`;
}

export function fhirServerDomain(fhirBase: string): string {
  try {
    const u = new URL(fhirBase);
    return u.host + (u.pathname.replace(/\/+$/, "") || "");
  } catch {
    return fhirBase.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
}

export function toSmartSettings(
  fhirBase: string,
  config: SmartConfiguration,
  meta?: Partial<CatalogEntry>,
): SmartSettings {
  const base = fhirBase.replace(/\/+$/, "");
  return {
    name: meta?.name,
    vendor: meta?.vendor,
    persona: meta?.persona,
    fhirBase: base,
    audience: base,
    fhirServerDomain: fhirServerDomain(base),
    authorizationEndpoint: config.authorization_endpoint,
    tokenEndpoint: config.token_endpoint,
    registrationEndpoint: config.registration_endpoint,
    jwksUri: config.jwks_uri,
    scopesSupported: config.scopes_supported,
    capabilities: config.capabilities,
    grantTypesSupported: config.grant_types_supported,
    codeChallengeMethodsSupported: config.code_challenge_methods_supported,
    tokenEndpointAuthMethodsSupported: config.token_endpoint_auth_methods_supported,
    smartConfigurationUrl: smartConfigurationUrl(base),
    raw: config,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchSmartConfiguration(
  fhirBase: string,
  init?: RequestInit,
): Promise<SmartConfiguration> {
  const safeBase = normalizeFhirBase(fhirBase);
  const url = smartConfigurationUrl(safeBase);

  try {
    // guarded-fetch (Vercel Labs): SSRF + DNS pin + redirect/header hardening.
    const { signal, headers, ...rest } = init || {};
    const res = await guardedFetch(url, {
      ...rest,
      signal: signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        ...(headers || {}),
      },
    });

    if (!res.ok) {
      throw new Error(`SMART configuration fetch failed (${res.status}) for ${url}`);
    }
    return (await res.json()) as SmartConfiguration;
  } catch (err) {
    if (err instanceof GuardedFetchError) {
      throw new Error(`Blocked unsafe FHIR URL (${err.code}): ${url}`);
    }
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(`SMART configuration fetch timed out or was aborted for ${url}`);
    }
    throw err;
  }
}

export async function enrichFhirBase(
  fhirBase: string,
  meta?: Partial<CatalogEntry>,
  init?: RequestInit,
): Promise<SmartSettings> {
  const safeBase = normalizeFhirBase(fhirBase);
  const config = await fetchSmartConfiguration(safeBase, init);
  return toSmartSettings(safeBase, config, meta);
}
