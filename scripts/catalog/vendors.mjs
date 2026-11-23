/**
 * Map Lantern developer names → Smartfind vendor keys and URL preferences.
 * Preference URLs come from Lantern's developer-feedback ranking (org counts).
 */

/**
 * @typedef {{
 *   vendor: string,
 *   match: RegExp,
 *   preferUrlIncludes?: string[],
 *   skipUrlIncludes?: string[],
 *   persona?: 'provider' | 'patient' | 'both',
 * }} VendorPreset
 */

/** @type {VendorPreset[]} */
export const VENDOR_PRESETS = [
  {
    vendor: "athena",
    match: /^athenahealth/i,
    preferUrlIncludes: ["service-base-urls.api.fhir.athena.io"],
    skipUrlIncludes: ["mydata.athenahealth.com/static/servicebaseurls.json"],
    persona: "both",
  },
  {
    vendor: "eclinicalworks",
    match: /^eClinicalWorks/i,
    preferUrlIncludes: ["ecwopendev/global/practiceList"],
    persona: "both",
  },
  {
    vendor: "office-ally",
    match: /^Office Ally/i,
    preferUrlIncludes: ["fhirpt.officeally.com"],
    persona: "both",
  },
  {
    vendor: "advancedmd",
    match: /^AdvancedMD/i,
    preferUrlIncludes: ["providerapi.advancedmd.com"],
    persona: "both",
  },
  {
    vendor: "pointclickcare",
    match: /^PointClickCare/i,
    preferUrlIncludes: ["fhir.pointclickcare.com"],
    persona: "both",
  },
  {
    vendor: "practice-fusion",
    match: /^Practice Fusion/i,
    preferUrlIncludes: ["practicefusion.com"],
    persona: "both",
  },
  {
    vendor: "nextgen",
    match: /^NextGen Healthcare/i,
    preferUrlIncludes: ["services.fhir.nextgen.com/FhirServiceBaseBundle-R4"],
    persona: "both",
  },
  {
    vendor: "veradigm",
    match: /^Veradigm/i,
    preferUrlIncludes: ["open.platform.veradigm.com"],
    persona: "patient",
  },
  {
    vendor: "greenway",
    match: /^Greenway Health/i,
    preferUrlIncludes: ["greenwayhealth.com"],
    persona: "both",
  },
  {
    vendor: "oracle-health",
    match: /^Oracle Health/i,
    preferUrlIncludes: [
      "millennium_patient_r4_endpoints.json",
      "millennium_provider_r4_endpoints.json",
    ],
    persona: "patient",
  },
  {
    vendor: "epic",
    match: /^Epic Systems/i,
    // Brands is what Lantern indexes; R4 Endpoint Bundle is a useful supplement.
    preferUrlIncludes: ["open.epic.com/Endpoints/Brands", "open.epic.com/Endpoints/R4"],
    persona: "both",
  },
  {
    vendor: "elation",
    match: /^Elation Health/i,
    preferUrlIncludes: ["fhir.elationemr.com"],
    persona: "both",
  },
  {
    vendor: "meditech",
    match: /MEDITECH/i,
    preferUrlIncludes: ["fhir-apis.meditech.com"],
    persona: "both",
  },
  {
    vendor: "darena",
    match: /^Darena/i,
    preferUrlIncludes: ["meldrx.com"],
    persona: "both",
  },
];

/** Curated supplements Lantern may omit (e.g. Oracle provider list). */
export const CURATED_SUPPLEMENTS = [
  {
    developer: "Oracle Health (provider supplement)",
    vendor: "oracle-health",
    listUrl:
      "https://raw.githubusercontent.com/oracle-samples/ignite-endpoints/refs/heads/main/oracle_health_fhir_endpoints/millennium_provider_r4_endpoints.json",
    persona: "provider",
  },
  {
    developer: "Epic Systems Corporation (R4 supplement)",
    vendor: "epic",
    listUrl: "https://open.epic.com/Endpoints/R4",
    persona: "both",
  },
];

export function matchPreset(developer) {
  return VENDOR_PRESETS.find((p) => p.match.test(developer)) || null;
}

/**
 * From Lantern sources for one developer, pick the best list URL(s) to fetch.
 * @param {import('./lantern-index.mjs').LanternSource[]} sources
 * @param {VendorPreset} preset
 */
export function selectListUrls(sources, preset) {
  const forDev = sources.filter((s) => preset.match.test(s.developer));
  if (!forDev.length) return [];

  const filtered = forDev.filter((s) => {
    if (preset.skipUrlIncludes?.some((x) => s.listUrl.includes(x))) return false;
    return true;
  });

  if (preset.preferUrlIncludes?.length) {
    const preferred = [];
    for (const needle of preset.preferUrlIncludes) {
      for (const s of filtered) {
        if (s.listUrl.includes(needle) && !preferred.some((p) => p.listUrl === s.listUrl)) {
          preferred.push(s);
        }
      }
    }
    if (preferred.length) return preferred;
  }

  // Fallback: highest endpoint count from Lantern
  return [...filtered].sort((a, b) => b.endpointCount - a.endpointCount).slice(0, 1);
}
