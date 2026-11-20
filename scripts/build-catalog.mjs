#!/usr/bin/env node
/**
 * Rebuild data/catalog.json from public Epic + Oracle Health endpoint lists.
 * Run: node scripts/build-catalog.mjs
 */
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EPIC_R4 = "https://open.epic.com/Endpoints/R4";
const CERNER_PROVIDER =
  "https://raw.githubusercontent.com/oracle-samples/ignite-endpoints/refs/heads/main/oracle_health_fhir_endpoints/millennium_provider_r4_endpoints.json";

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "unknown"
  );
}

function idFor(vendor, name, fhir) {
  return `${vendor}-${slugify(name)}-${createHash("sha1").update(fhir).digest("hex").slice(0, 8)}`;
}

async function main() {
  console.log("Downloading Epic R4 endpoint bundle…");
  const epic = await (await fetch(EPIC_R4)).json();
  console.log("Downloading Oracle Health provider endpoints…");
  const cerner = await (await fetch(CERNER_PROVIDER)).json();

  const entries = [];

  for (const e of epic.entry || []) {
    const r = e.resource || {};
    if (r.resourceType !== "Endpoint") continue;
    const fhirBase = String(r.address || "").replace(/\/+$/, "");
    const name = r.name || fhirBase;
    if (!fhirBase) continue;
    entries.push({
      id: idFor("epic", name, fhirBase),
      name,
      aliases: [],
      vendor: "epic",
      // Public Epic list is patient-access oriented; base URL is commonly reused as iss/aud.
      persona: "both",
      fhirBase,
      state: null,
      city: null,
      source: "epic-r4-endpoint-bundle",
    });
  }

  const orgs = new Map();
  const endpoints = new Map();
  for (const e of cerner.entry || []) {
    const r = e.resource || {};
    if (r.resourceType === "Organization") orgs.set(r.id, r);
    if (r.resourceType === "Endpoint") {
      endpoints.set(r.id, r);
      if (e.fullUrl) endpoints.set(e.fullUrl, r);
    }
  }

  for (const org of orgs.values()) {
    const name = org.name || "Unknown";
    const aliases = Array.isArray(org.alias) ? org.alias : [];
    const addr = (org.address && org.address[0]) || {};
    for (const ref of org.endpoint || []) {
      const refStr = ref.reference;
      if (!refStr) continue;
      const ep =
        endpoints.get(refStr) ||
        endpoints.get(refStr.split("/").pop());
      if (!ep) continue;
      const fhirBase = String(ep.address || "").replace(/\/+$/, "");
      if (!fhirBase) continue;
      entries.push({
        id: idFor("cerner", name, fhirBase),
        name,
        aliases,
        vendor: "oracle-health",
        persona: "provider",
        fhirBase,
        state: addr.state || null,
        city: addr.city || null,
        source: "oracle-millennium-provider-r4",
      });
    }
  }

  const sandboxes = [
    {
      id: "sandbox-epic-r4",
      name: "Epic FHIR Sandbox (R4)",
      aliases: ["Epic Sandbox", "fhir.epic.com"],
      vendor: "epic",
      persona: "both",
      fhirBase: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
      state: null,
      city: null,
      source: "sandbox",
    },
    {
      id: "sandbox-cerner-r4",
      name: "Oracle Health Millennium Open Sandbox (R4)",
      aliases: ["Cerner Sandbox", "Oracle Health Sandbox"],
      vendor: "oracle-health",
      persona: "both",
      fhirBase:
        "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
      state: null,
      city: null,
      source: "sandbox",
    },
    {
      id: "sandbox-smart-r4",
      name: "SMART Health IT R4 Sandbox",
      aliases: ["SMART Sandbox", "smarthealthit"],
      vendor: "smart-health-it",
      persona: "both",
      fhirBase: "https://r4.smarthealthit.org",
      state: null,
      city: null,
      source: "sandbox",
    },
  ];

  const byBase = new Map();
  for (const e of [...sandboxes, ...entries]) {
    const key = e.fhirBase.toLowerCase();
    const cur = byBase.get(key);
    if (!cur) {
      byBase.set(key, e);
      continue;
    }
    const aliases = [
      ...new Set([
        ...(cur.aliases || []),
        ...(e.aliases || []),
        cur.name !== e.name ? e.name : null,
      ].filter(Boolean)),
    ].slice(0, 12);
    const prefer =
      e.persona === "provider" && cur.persona !== "provider" ? { ...e } : { ...cur };
    prefer.aliases = aliases;
    if (
      (e.persona === "provider" || cur.persona === "provider") &&
      (e.persona === "patient" || cur.persona === "patient")
    ) {
      prefer.persona = "both";
    }
    byBase.set(key, prefer);
  }

  const final = [...byBase.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: [EPIC_R4, CERNER_PROVIDER, "sandbox"],
    count: final.length,
    entries: final,
  };

  for (const dir of [
    join(root, "data"),
    join(root, "packages/smartfind/data"),
    join(root, "public/data"),
  ]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "catalog.json"), JSON.stringify(out));
  }
  console.log(`Wrote ${final.length} entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
