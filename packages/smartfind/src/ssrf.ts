/**
 * URL policy helpers used before outbound fetch.
 * Actual SSRF connect protection (DNS pin + private IP block) is handled by
 * `guarded-fetch` in enrich.ts.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

/** Parse and require HTTPS FHIR bases with no credentials / hash / localhost. */
export function parseHttpsFhirBase(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid FHIR base URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS FHIR base URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("FHIR base URLs must not include credentials");
  }
  if (url.hash) {
    throw new Error("FHIR base URLs must not include a hash");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) {
    throw new Error("FHIR base URL is missing a hostname");
  }
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    throw new Error("FHIR base hostname is not allowed");
  }

  return url;
}

export function normalizeFhirBase(raw: string): string {
  return parseHttpsFhirBase(raw).toString().replace(/\/+$/, "");
}

/** @deprecated Use normalizeFhirBase + safeFetch; kept for callers that only need HTTPS policy. */
export async function assertSafeFhirBaseUrl(raw: string): Promise<string> {
  return normalizeFhirBase(raw);
}
