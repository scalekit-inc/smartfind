# Smartfind

Open-source **SMART on FHIR discovery** for US health systems.

Help developers (and platforms like [Scalekit](https://docs.scalekit.com/agentkit/connectors/customsmartfhir/)) go from *“Mayo Clinic”* → authorize URL, token URL, and `aud` — without hand-collecting hospital FHIR settings.

**Live demo:** [https://smartfind.apps.grok.bot](https://smartfind.apps.grok.bot)  
**Developers guide (in the demo):** [/developers](https://smartfind.apps.grok.bot/developers)

---

## Distribution

| Artifact | Who uses it | How it ships |
|---|---|---|
| **`smartfind` npm package** | App backends / CLIs | `npm i smartfind` — search + enrich in *their* process |
| **This git repo** | Contributors / self-hosters | Public GitHub clone; demo app + package source |
| **Demo web app** | Humans trying the UX | Hosted (Cursor Apps / Vercel / etc.); optional HTTP API |

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
npm run catalog      # refresh Epic + Oracle endpoint data
npm run cli -- search "AdventHealth" --limit 5
```

---

## Publish `smartfind` to npm

### Recommended: public GitHub repo + GitHub Actions

For OSS discovery (stars / SEO) and the CI you already know, **make GitHub the public home** of this repo. Workflows live in `.github/workflows/` (same pattern as [`scalekit-sdk-node`](https://github.com/scalekit-inc/scalekit-sdk-node/blob/main/.github/workflows/release.yml)).

**Secrets on a public repo — yes, this is safe**

| Mechanism | Visible to the public? |
|---|---|
| **Repository / Environment secrets** (`Settings → Secrets`) | No. Encrypted at rest; only injected into jobs you authorize. Not in logs unless you `echo` them (Actions redacts common secret values). |
| **Fork PRs** | Secrets are **not** available to workflows from forks by default. Your `release` job only runs on `release: published`, which forks cannot trigger. |
| **npm Trusted Publishing (OIDC)** — what this repo uses | Even better: **no long-lived `NPM_TOKEN`**. GitHub proves identity to npm via OIDC (`id-token: write` + `npm publish --provenance`). |

Do **not** commit tokens, put them in workflow YAML, or print them in steps.

**One-time setup**

1. Create the public GitHub repo **`scalekit-inc/smartfind`** (empty, no README).
2. Push this code (from a machine with `gh` / GitHub access to the org):

```bash
gh repo create scalekit-inc/smartfind --public --description "Discover SMART on FHIR settings for US health systems" --source=. --remote=github --push
# or, if the empty repo already exists:
git remote add github https://github.com/scalekit-inc/smartfind.git
git push -u github main
```

3. On [npmjs.com](https://www.npmjs.com) → package settings → **Trusted Publisher**: GitHub Actions, repo `scalekit-inc/smartfind`, workflow `release.yml`, environment `release`.
4. In the GitHub repo → Settings → Environments → create **`release`**. No `NPM_TOKEN` needed if trusted publishing is configured.
5. Grant the Cursor GitHub App access to `scalekit-inc/smartfind` if you want agents to work on it later.

**What CI does**

| Trigger | Workflow |
|---|---|
| Push / PR to `main` | `ci.yml` — install, build, CLI smoke, `npm pack --dry-run` |
| GitHub Release published | `release.yml` — version checks, build, `npm publish --provenance` |

**Release a version**

```bash
# 1. Bump version in packages/smartfind/package.json
git add packages/smartfind/package.json
git commit -m "Release smartfind v0.1.0"
git push origin main

# 2. Create a GitHub Release whose tag matches package.json (v0.1.0 or smartfind-v0.1.0)
gh release create v0.1.0 --title "smartfind v0.1.0" --generate-notes
```

### Manual publish (laptop)

```bash
npm login
cd packages/smartfind
npm ci && npm run build
npm publish --access public
```

---

## Catalog sources

- [Epic R4 Endpoint Bundle](https://open.epic.com/Endpoints/R4)
- [Oracle Health Millennium provider endpoints](https://raw.githubusercontent.com/oracle-samples/ignite-endpoints/refs/heads/main/oracle_health_fhir_endpoints/millennium_provider_r4_endpoints.json)
- Public sandboxes (Epic, Oracle Health, SMART Health IT)

---

## Security

Enrichment uses [`guarded-fetch`](https://www.npmjs.com/package/guarded-fetch). The demo `/api/enrich` route also allowlists known EHR hosts and rate-limits requests. Prefer the npm package in production so you control caching and network egress.

---

## License

MIT
