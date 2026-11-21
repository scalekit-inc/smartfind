#!/usr/bin/env node
/**
 * Rebuild data/catalog.json
 *
 * Architecture:
 *   1. Lantern (or committed data/lantern-sources.json) → discover vendor list URLs
 *   2. Fetch each vendor's published Bundle/JSON as the source of truth
 *   3. Normalize → catalog.json
 *
 * Usage:
 *   node scripts/build-catalog.mjs
 *   node scripts/build-catalog.mjs --refresh-lantern
 *   node scripts/build-catalog.mjs --vendors=athena,advancedmd,epic
 *
 * Large Bundles (athena ~136MB, Epic Brands ~97MB):
 *   NODE_OPTIONS=--max-old-space-size=8192 npm run catalog
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CURATED_SUPPLEMENTS,
  VENDOR_PRESETS,
  selectListUrls,
} from "./catalog/vendors.mjs";
import { dedupeByFhirBase, parseFhirBundle } from "./catalog/parse-fhir-bundle.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANTERN_FALLBACK = join(root, "data/lantern-sources.json");

const args = process.argv.slice(2);
const refreshLantern = args.includes("--refresh-lantern");
const vendorsArg = args.find((a) => a.startsWith("--vendors="));
const onlyVendors = vendorsArg
  ? new Set(
      vendorsArg
        .slice("--vendors=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

function loadLanternSources() {
  if (refreshLantern) {
    console.log("Refreshing Lantern source index…");
    const py = join(root, "scripts/catalog/extract-lantern-sources.py");
    const result = spawnSync("python3", [py], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 300_000,
    });
    if (result.status !== 0) {
      console.warn(
        "Lantern refresh failed; using committed fallback.",
        result.stderr || result.error,
      );
    } else {
      const sources = JSON.parse(result.stdout);
      writeFileSync(LANTERN_FALLBACK, `${JSON.stringify(sources, null, 2)}\n`);
      console.log(`Wrote ${sources.length} Lantern sources → data/lantern-sources.json`);
      return sources;
    }
  }
  return JSON.parse(readFileSync(LANTERN_FALLBACK, "utf8"));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/fhir+json, application/json;q=0.9, */*;q=0.1" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** athena's Bundle (~136MB) overflows Node's JSON stack; parse via Python. */
function parseLargeBundleWithPython(url, vendor, persona) {
  const py = join(root, "scripts/catalog/parse-vendor-bundle.py");
  const result = spawnSync("python3", [py, url, vendor, persona], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    timeout: 600_000,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.error || "python parse failed");
  }
  // stdout is JSON array; stderr has a progress comment
  const lines = result.stdout.trim().split("\n");
  const jsonLine = lines.filter((l) => l.startsWith("[") || l.startsWith("{")).join("\n");
  return JSON.parse(jsonLine || result.stdout);
}

const LARGE_BUNDLE_HOSTS = ["service-base-urls.api.fhir.athena.io"];

function sandboxes() {
  return [
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
      id: "sandbox-advancedmd-r4",
      name: "AdvancedMD FHIR Shared R4 (SMART discovery)",
      aliases: ["AdvancedMD", "providerapi.advancedmd.com"],
      vendor: "advancedmd",
      persona: "both",
      fhirBase: "https://providerapi.advancedmd.com/v1/r4",
      state: null,
      city: null,
      source: "sandbox",
    },
    {
      id: "sandbox-athena-r4",
      name: "athenahealth FHIR Platform R4",
      aliases: ["athena", "api.platform.athenahealth.com"],
      vendor: "athena",
      persona: "both",
      fhirBase: "https://api.platform.athenahealth.com/fhir/r4",
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
}

async function main() {
  const lanternSources = loadLanternSources();

  /** @type {{ developer: string, vendor: string, listUrl: string, persona: string }[]} */
  const jobs = [];

  for (const preset of VENDOR_PRESETS) {
    if (onlyVendors && !onlyVendors.has(preset.vendor)) continue;
    const selected = selectListUrls(lanternSources, preset);
    for (const s of selected) {
      jobs.push({
        developer: s.developer,
        vendor: preset.vendor,
        listUrl: s.listUrl,
        persona: preset.persona || "both",
      });
    }
  }

  for (const s of CURATED_SUPPLEMENTS) {
    if (onlyVendors && !onlyVendors.has(s.vendor)) continue;
    if (jobs.some((j) => j.listUrl === s.listUrl)) continue;
    jobs.push({
      developer: s.developer,
      vendor: s.vendor,
      listUrl: s.listUrl,
      persona: s.persona || "both",
    });
  }

  console.log(`Ingesting ${jobs.length} vendor list(s)…`);
  const all = [];
  const sourcesUsed = [];

  for (const job of jobs) {
    console.log(`  ${job.vendor} ← ${job.listUrl}`);
    try {
      let parsed;
      if (LARGE_BUNDLE_HOSTS.some((h) => job.listUrl.includes(h))) {
        parsed = parseLargeBundleWithPython(job.listUrl, job.vendor, job.persona);
      } else {
        const bundle = await fetchJson(job.listUrl);
        parsed = parseFhirBundle(bundle, {
          vendor: job.vendor,
          source: job.listUrl,
          persona: job.persona,
        });
      }
      all.push(...parsed);
      sourcesUsed.push(job.listUrl);
      console.log(`    → ${parsed.length} entries`);
    } catch (err) {
      console.warn(`    ! skipped: ${err instanceof Error ? err.message : err}`);
    }
  }

  const final = dedupeByFhirBase([...sandboxes(), ...all]);
  const out = {
    version: 2,
    generatedAt: new Date().toISOString(),
    index: "lantern+curated",
    sources: [...new Set([...sourcesUsed, "sandbox"])],
    count: final.length,
    entries: final,
  };

  // Single source of truth lives in the package; sync copies for local Next assets.
  const packageCatalog = join(root, "packages/smartfind/data/catalog.json");
  mkdirSync(dirname(packageCatalog), { recursive: true });
  writeFileSync(packageCatalog, JSON.stringify(out));
  for (const dir of [join(root, "data"), join(root, "public/data")]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "catalog.json"), JSON.stringify(out));
  }

  const byVendor = final.reduce((acc, e) => {
    acc[e.vendor] = (acc[e.vendor] || 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${final.length} unique FHIR bases`, byVendor);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
