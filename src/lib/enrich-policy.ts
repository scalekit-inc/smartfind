import { getByFhirBase, parseHttpsFhirBase } from "smartfind";

/** Public EHR / sandbox host suffixes allowed for unlisted paste-in URLs. */
const ALLOWED_HOST_SUFFIXES = [
  "epic.com",
  "epichosted.com",
  "cerner.com",
  "oracle.com",
  "oraclecloud.com",
  "advancedmd.com",
  "smarthealthit.org",
  "meditech.com",
  "athenahealth.com",
  "allscripts.com",
  "nextgen.com",
  "eclinicalworks.com",
  "veradigm.com",
  "officeally.com",
  "pointclickcare.com",
  "practicefusion.com",
  "greenwayhealth.com",
  "elationemr.com",
  "meldrx.com",
];

function hostAllowed(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * fhirBase must be HTTPS, in our catalog, or on a known EHR host suffix.
 * Connect-time SSRF protection is provided by guarded-fetch inside smartfind.
 */
export function assertEnrichableFhirBase(fhirBase: string): string {
  const url = parseHttpsFhirBase(fhirBase);
  const normalized = url.toString().replace(/\/+$/, "");
  if (getByFhirBase(normalized)) return normalized;
  if (hostAllowed(url.hostname)) return normalized;
  throw new Error(
    "FHIR base must match a catalog entry or a known EHR host (e.g. epic.com, cerner.com)",
  );
}
