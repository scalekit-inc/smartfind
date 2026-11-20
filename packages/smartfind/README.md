# smartfind

Discover **SMART on FHIR** settings for US health systems.

Search public Epic + Oracle Health endpoint catalogs, fetch live
`/.well-known/smart-configuration`, and get auth/token/`aud` fields ready for
your OAuth client (or [Scalekit’s SMART connector](https://docs.scalekit.com/agentkit/connectors/customsmartfhir/)).

```bash
npm i smartfind
# or the same package under the Scalekit scope:
npm i @scalekit-sdk/smartfind
```

## Who this is for

You already have (or will get) an EHR `client_id` / `client_secret`.  
Smartfind solves the other half: **which FHIR base and OAuth URLs belong to this hospital?**

Typical flow in your product:

1. User searches for their health system  
2. You call `searchCatalog` → show matches  
3. You call `discoverByFhirBase` → get authorize/token/`aud`  
4. You start SMART OAuth with **your** client credentials  

## Quick start

### Library

```ts
import { searchCatalog, discoverByFhirBase } from "smartfind";

const matches = searchCatalog({
  query: "CarolinaEast",
  vendor: "oracle-health", // or "epic" | undefined
  persona: "any",
  limit: 5,
});

const { settings, scalekit } = await discoverByFhirBase(matches[0].fhirBase);

console.log(scalekit.authorizationEndpoint);
console.log(scalekit.tokenEndpoint);
console.log(scalekit.audience); // send as SMART `aud`
```

Run enrichment on your **server**. Browser calls to hospital FHIR hosts often fail CORS. Outbound fetches use [`guarded-fetch`](https://www.npmjs.com/package/guarded-fetch) (SSRF-safe).

### CLI

```bash
npx smartfind search "Mayo" --limit 5
npx smartfind enrich https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
npx smartfind scalekit https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
```

## API surface

| Export | Purpose |
|---|---|
| `searchCatalog(options)` | Search the bundled catalog |
| `discoverByFhirBase(url)` | Fetch SMART config + Scalekit-shaped export |
| `discoverById(id)` | Same, by catalog id |
| `enrichFhirBase(url)` | SMART settings only |
| `toScalekitConnection(settings)` | Map settings → Scalekit connection fields |
| `getCatalog()` / `setCatalog(catalog)` | Inspect or replace catalog data |

Catalog JSON is also importable:

```ts
import catalog from "smartfind/catalog.json" with { type: "json" };
```

## Catalog

Bundled data (~1.8k endpoints) from:

- [Epic R4 Endpoint Bundle](https://open.epic.com/Endpoints/R4)
- [Oracle Health provider R4 endpoints](https://github.com/oracle-samples/ignite-endpoints)
- Public sandboxes

Rebuild from the monorepo root: `npm run catalog`.

## Requirements

- Node.js **20.19+** (for `guarded-fetch`)
- ESM (`"type": "module"`)

## License

MIT
