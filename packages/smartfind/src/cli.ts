#!/usr/bin/env node
import { searchCatalog } from "./catalog.js";
import { discoverByFhirBase, discoverSearch } from "./discover.js";

function usage(): never {
  console.log(`smartfind — discover provider SMART on FHIR settings

Usage:
  smartfind search <query> [--persona provider|patient|both|any] [--vendor epic|oracle-health] [--state CA] [--limit 10]
  smartfind enrich <fhir-base-url>
  smartfind scalekit <fhir-base-url>

Examples:
  smartfind search "CarolinaEast"
  smartfind enrich https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
  smartfind scalekit https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === "-h" || cmd === "--help") usage();

  if (cmd === "search") {
    const query = rest.find((a) => !a.startsWith("--")) || "";
    const persona = (argValue(rest, "--persona") || "provider") as
      | "provider"
      | "patient"
      | "both"
      | "any";
    const vendor = argValue(rest, "--vendor");
    const state = argValue(rest, "--state");
    const limit = Number(argValue(rest, "--limit") || "10");
    const enrich = rest.includes("--enrich");

    if (enrich && query) {
      const result = await discoverSearch({ query, persona, vendor, state, limit });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const matches = searchCatalog({ query, persona, vendor, state, limit });
    console.log(JSON.stringify({ count: matches.length, matches }, null, 2));
    return;
  }

  if (cmd === "enrich" || cmd === "scalekit") {
    const fhirBase = rest[0];
    if (!fhirBase) usage();
    const result = await discoverByFhirBase(fhirBase);
    console.log(
      JSON.stringify(cmd === "scalekit" ? result.scalekit : result, null, 2),
    );
    return;
  }

  usage();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
