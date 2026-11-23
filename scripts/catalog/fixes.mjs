/**
 * Corrections to vendor-published endpoint data, applied after parsing and before dedupe.
 * Each entry here was confirmed against the live server.
 */
import { idFor } from "./parse-fhir-bundle.mjs";

/** Bases a vendor publishes that are not its FHIR server. */
const BASE_REWRITES = [
  // Elation lists every practice's endpoint as the bare host. Its shared R4 server, with
  // /metadata and /.well-known/smart-configuration, is under /fhir.
  { vendor: "elation", from: "https://fhir.elationemr.com", to: "https://fhir.elationemr.com/fhir" },
];

/** Non-production servers a vendor lists alongside its real endpoints. */
const EXCLUDED_HOSTS = [
  // Veradigm's developer FHIRPoint server (fhirdev.fhirpointdev.open.allscripts.com).
  { vendor: "veradigm", host: /(^|\.)fhirpointdev\./i },
];

function hostOf(base) {
  try {
    return new URL(base).hostname;
  } catch {
    return "";
  }
}

/** @param {object[]} entries */
export function applyCatalogFixes(entries) {
  const out = [];
  for (const e of entries) {
    if (EXCLUDED_HOSTS.some((x) => x.vendor === e.vendor && x.host.test(hostOf(e.fhirBase)))) {
      continue;
    }
    const rewrite = BASE_REWRITES.find(
      (r) => r.vendor === e.vendor && e.fhirBase.replace(/\/+$/, "") === r.from,
    );
    if (!rewrite) {
      out.push(e);
      continue;
    }
    // Ids embed a hash of the base; keep them consistent with the corrected base.
    const id = e.id === idFor(e.vendor, e.name, e.fhirBase) ? idFor(e.vendor, e.name, rewrite.to) : e.id;
    out.push({ ...e, id, fhirBase: rewrite.to });
  }
  return out;
}

/**
 * Ids are vendor + slug(name) + hash(base), so two practices on one base whose names differ only
 * in punctuation or case ("_Master Practice" / "Master Practice") get the same id, and getById()
 * can only reach the first. Suffix the later ones (-2, -3, …). Run after dedupe, on sorted entries.
 * @param {object[]} entries
 */
export function ensureUniqueIds(entries) {
  const seen = new Map();
  return entries.map((e) => {
    const n = (seen.get(e.id) || 0) + 1;
    seen.set(e.id, n);
    return n === 1 ? e : { ...e, id: `${e.id}-${n}` };
  });
}
