# Smartfind

Open-source **SMART on FHIR discovery** for US health systems.

Help developers (and platforms like [Scalekit](https://docs.scalekit.com/agentkit/connectors/customsmartfhir/)) go from *“Mayo Clinic”* → authorize URL, token URL, and `aud` — without hand-collecting hospital FHIR settings.

**Try it:** `npx smartfind search "Mayo Clinic"`, or run the demo site locally (see [Run the demo](#run-the-demo-locally)).

---

## Distribution

| Artifact | Who uses it | How it ships |
|---|---|---|
| **`smartfind` npm package** | App backends / CLIs | `npm i smartfind` (also published as `@scalekit-sdk/smartfind`) — search + enrich in *their* process |
| **This git repo** | Contributors / self-hosters | Public GitHub clone; demo app + package source |
| **Demo web app** | Humans trying the UX | Self-hosted (Vercel or any Node.js host); optional HTTP API |

```
End user picks hospital in YOUR product
        │
        ▼
Your backend  ──npm──►  smartfind  ──HTTPS──►  hospital /.well-known/smart-configuration
        │
        ▼
Your Epic/Oracle client_id + discovered endpoints  ──►  SMART OAuth
```

Smartfind does **not** replace EHR app registration. You still bring `client_id` / `client_secret`.

---

## Repo layout

| Path | Role |
|---|---|
| [`packages/smartfind`](./packages/smartfind) | Publishable JS library + CLI |
| `src/` | Next.js demo (search UI, `/developers`, enrich API) |
| `data/catalog.json` | Bundled endpoint index (also copied into the package) |
| `scripts/build-catalog.mjs` | Refresh catalog from Epic + Oracle public lists |

---

## Use the package (consumers)

```bash
npm i smartfind

npx smartfind search "CarolinaEast"
npx smartfind scalekit https://fhir-ehr.cerner.com/r4/<tenant>
```

```ts
import { searchCatalog, discoverByFhirBase } from "smartfind";

const matches = searchCatalog({ query: "Mayo", vendor: "epic", limit: 5 });
const { scalekit } = await discoverByFhirBase(matches[0].fhirBase);
// scalekit.authorizationEndpoint, tokenEndpoint, audience, ...
```

Full API notes: [`packages/smartfind/README.md`](./packages/smartfind/README.md).

---

## Run the demo locally

```bash
npm install
npm run build:package
npm run dev          # http://127.0.0.1:3847
```

```bash
# Rebuild catalog: Lantern index → vendor Bundles as source of truth
NODE_OPTIONS=--max-old-space-size=8192 npm run catalog
# Optional: refresh data/lantern-sources.json from Lantern first
NODE_OPTIONS=--max-old-space-size=8192 npm run catalog -- --refresh-lantern

npm run cli -- search "AdventHealth" --limit 5
```

---

## Releasing to npm

The package is published under two names from the same build: `smartfind` and `@scalekit-sdk/smartfind`.

Publishing runs from GitHub Actions with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored anywhere:

| Trigger | Workflow |
|---|---|
| Push or PR to `master` | `ci.yml`: builds the package, runs a CLI smoke test and `npm pack --dry-run`, then builds and lints the demo site |
| GitHub Release published | `release.yml`: checks the tag matches the version, builds once, publishes both names with provenance |

To release a version:

```bash
# 1. Bump the version in packages/smartfind/package.json, commit and push to master
# 2. Create a GitHub Release whose tag matches it (v0.2.0 or smartfind-v0.2.0)
gh release create v0.2.0 --title "smartfind v0.2.0" --generate-notes
```

A pre-release publishes under the `next` dist-tag; a normal release under `latest`.

---

## Catalog sources

Smartfind does **not** treat Lantern’s CSV as the catalog. Instead:

1. **[Lantern](https://lantern.healthit.gov/)** (via committed `data/lantern-sources.json`, refreshable) discovers each vendor’s published Service Base URL list.
2. Those **vendor Bundles/JSON files** are fetched as the source of truth (athena, eCW, AdvancedMD, Epic Brands, Oracle, Veradigm, …).
3. A few curated supplements fill gaps Lantern’s patient-oriented CHPL lists omit (e.g. Oracle **provider** endpoints, Epic R4 Endpoint Bundle).

Rebuild with `npm run catalog`. Large vendor files (athena ~136MB, Epic Brands ~97MB) need a larger Node heap (`NODE_OPTIONS=--max-old-space-size=8192`). Git stores the catalog as `packages/smartfind/data/catalog.json.gz` (~5MB); `npm run sync-catalog` expands it for local Next assets.

---

## Security

Enrichment uses [`guarded-fetch`](https://www.npmjs.com/package/guarded-fetch). The demo `/api/enrich` route also allowlists known EHR hosts and rate-limits requests. Prefer the npm package in production so you control caching and network egress.

---

## License

MIT
