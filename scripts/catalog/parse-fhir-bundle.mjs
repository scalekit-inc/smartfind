import { createHash } from "node:crypto";

const ADVANCEDMD_SKIP = new Set(["DEV", "STAGE", "PROD", "Invalid"]);

export function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "unknown"
  );
}

export function idFor(vendor, name, fhir) {
  return `${vendor}-${slugify(name)}-${createHash("sha1").update(fhir).digest("hex").slice(0, 8)}`;
}

function normalizeBase(address) {
  return String(address || "").trim().replace(/\/+$/, "");
}

function orgAddress(org) {
  const addr = (org?.address && org.address[0]) || {};
  return {
    state: addr.state || null,
    city: addr.city || null,
  };
}

function resolveEndpoint(ref, endpoints) {
  if (!ref) return null;
  const s = String(ref);
  return (
    endpoints.get(s) ||
    endpoints.get(s.replace(/^Endpoint\//, "")) ||
    endpoints.get(s.split("/").pop()) ||
    null
  );
}

/**
 * Parse a FHIR Bundle (or Bundle-like JSON) into catalog entries.
 * @param {object} bundle
 * @param {{ vendor: string, source: string, persona?: string }} meta
 */
export function parseFhirBundle(bundle, meta) {
  const { vendor, source, persona = "both" } = meta;
  const entries = [];

  const resources = [];
  if (Array.isArray(bundle?.entry)) {
    for (const e of bundle.entry) {
      if (e?.resource) resources.push({ fullUrl: e.fullUrl, resource: e.resource });
    }
  } else if (Array.isArray(bundle)) {
    for (const resource of bundle) {
      if (resource?.resourceType) resources.push({ fullUrl: null, resource });
    }
  } else if (bundle?.resourceType === "Endpoint" || bundle?.resourceType === "Organization") {
    resources.push({ fullUrl: null, resource: bundle });
  }

  const orgs = new Map();
  const endpoints = new Map();

  for (const { fullUrl, resource: r } of resources) {
    if (!r?.resourceType || !r.id) continue;
    if (r.resourceType === "Organization") {
      orgs.set(String(r.id), r);
      if (fullUrl) orgs.set(fullUrl, r);
    }
    if (r.resourceType === "Endpoint") {
      endpoints.set(String(r.id), r);
      if (fullUrl) endpoints.set(fullUrl, r);
    }
  }

  const seen = new Set();

  function pushEntry(name, fhirBase, org, extraAliases = []) {
    const base = normalizeBase(fhirBase);
    if (!base || !/^https:\/\//i.test(base)) return;
    const cleanName = String(name || "").trim() || base;
    if (vendor === "advancedmd" && ADVANCEDMD_SKIP.has(cleanName)) return;

    const key = `${base.toLowerCase()}\0${cleanName.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    const addr = orgAddress(org);
    const aliases = [...extraAliases].filter(Boolean).slice(0, 12);
    if (vendor === "advancedmd") {
      const officeId = base.split("/").pop();
      if (officeId && officeId !== "r4") aliases.push(`office:${officeId}`);
    }

    entries.push({
      id: idFor(vendor, cleanName, base),
      name: cleanName,
      aliases: [...new Set(aliases)],
      vendor,
      persona,
      fhirBase: base,
      state: addr.state,
      city: addr.city,
      source,
    });
  }

  // Org → Endpoint references (preferred: named health systems)
  for (const org of new Set(orgs.values())) {
    const name = org.name;
    for (const ref of org.endpoint || []) {
      const ep = resolveEndpoint(ref.reference || ref, endpoints);
      if (!ep?.address) continue;
      pushEntry(name, ep.address, org, Array.isArray(org.alias) ? org.alias : []);
    }
  }

  // Endpoint → managingOrganization (covers lists that only link one way)
  for (const ep of new Set(endpoints.values())) {
    if (!ep.address) continue;
    const orgRef = ep.managingOrganization?.reference;
    const org = orgRef
      ? orgs.get(orgRef) ||
        orgs.get(orgRef.replace(/^Organization\//, "")) ||
        orgs.get(orgRef.split("/").pop())
      : null;
    const name = org?.name || ep.name || ep.address;
    pushEntry(name, ep.address, org, org && Array.isArray(org.alias) ? org.alias : []);
  }

  // Endpoint-only bundles (no orgs)
  if (entries.length === 0) {
    for (const ep of new Set(endpoints.values())) {
      if (!ep.address) continue;
      pushEntry(ep.name || ep.address, ep.address, null);
    }
  }

  return entries;
}

/**
 * Deduplicate catalog entries by FHIR base + org name.
 * Shared multi-tenant bases (NextGen, some athena rows) must keep one row per org
 * so hospital search still works.
 * @param {object[]} entries
 */
export function dedupeByFhirBase(entries) {
  const byKey = new Map();
  for (const e of entries) {
    const key = `${e.fhirBase.toLowerCase()}\0${String(e.name || "").toLowerCase()}`;
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, { ...e, aliases: [...(e.aliases || [])] });
      continue;
    }
    const aliases = [
      ...new Set([...(cur.aliases || []), ...(e.aliases || [])].filter(Boolean)),
    ].slice(0, 12);
    const prefer =
      e.persona === "provider" && cur.persona !== "provider" ? { ...e } : { ...cur };
    prefer.aliases = aliases;
    if (
      (e.persona === "provider" || cur.persona === "provider") &&
      (e.persona === "patient" ||
        cur.persona === "patient" ||
        e.persona === "both" ||
        cur.persona === "both")
    ) {
      if (e.persona === "both" || cur.persona === "both" || e.persona !== cur.persona) {
        prefer.persona = "both";
      }
    }
    // Prefer rows that have city/state when merging identical name+base.
    if (!prefer.city && e.city) prefer.city = e.city;
    if (!prefer.state && e.state) prefer.state = e.state;
    byKey.set(key, prefer);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}
