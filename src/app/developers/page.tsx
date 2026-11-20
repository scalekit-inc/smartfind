import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developers — Smartfind",
  description:
    "Embed Smartfind: JS package, CLI, and HTTP API for SMART on FHIR discovery.",
};

export default function DevelopersPage() {
  return (
    <main className="atmosphere min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Smartfind
        </Link>
        <h1 className="font-display mt-4 text-4xl font-semibold text-[var(--ink)]">
          Developers
        </h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          Smartfind is an open catalog + enrichment utility. This website is the
          demo. Embed the package or call the APIs from your backend.
        </p>

        <Section title="What you get">
          <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--ink-soft)]">
            <li>Search US health systems (Epic + Oracle Health endpoint lists)</li>
            <li>
              Live <code className="rounded bg-white/70 px-1">.well-known/smart-configuration</code>{" "}
              enrichment (auth URL, token URL, scopes)
            </li>
            <li>Normalized export for Scalekit or any SMART client</li>
          </ul>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            Discovery does <strong className="text-[var(--ink)]">not</strong> register
            your app with Epic/Oracle or issue client credentials — you still do that
            in the EHR developer portal.
          </p>
        </Section>

        <Section title="1. JavaScript package">
          <pre className="overflow-x-auto rounded-2xl bg-[var(--ink)] p-4 text-sm text-[var(--sand)]">
{`npm i smartfind   # or use this repo: packages/smartfind

import { searchCatalog, discoverByFhirBase } from "smartfind";

const matches = searchCatalog({
  query: "CarolinaEast",
  vendor: "oracle-health", // or "epic"
  limit: 5,
});

const { settings, scalekit } = await discoverByFhirBase(matches[0].fhirBase);
console.log(scalekit.authorizationEndpoint, scalekit.audience);`}
          </pre>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Run enrichment on your <strong className="text-[var(--ink)]">server</strong>.
            Browser calls to hospital FHIR hosts often fail CORS; this package uses
            guarded-fetch for SSRF-safe outbound requests.
          </p>
        </Section>

        <Section title="2. CLI">
          <pre className="overflow-x-auto rounded-2xl bg-[var(--ink)] p-4 text-sm text-[var(--sand)]">
{`npm run cli -- search "Mayo" --limit 5
npm run cli -- scalekit https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`}
          </pre>
        </Section>

        <Section title="3. HTTP API (this demo)">
          <pre className="overflow-x-auto rounded-2xl bg-[var(--ink)] p-4 text-sm text-[var(--sand)]">
{`GET /api/search?q=Mayo&vendor=epic&limit=10
GET /api/enrich?id=<catalog-id>
GET /api/enrich?fhirBase=https://fhir-ehr.cerner.com/r4/<tenant>
GET /api/catalog`}
          </pre>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Enrich is rate-limited and only allows catalog entries or known EHR host
            suffixes. Prefer the package in production so you control caching and keys.
          </p>
        </Section>

        <Section title="4. Scalekit">
          <p className="text-sm text-[var(--ink-soft)]">
            In the demo, open a system → <strong className="text-[var(--ink)]">Scalekit JSON</strong> tab →
            copy into{" "}
            <a
              className="text-[var(--accent)] underline"
              href="https://docs.scalekit.com/agentkit/connectors/customsmartfhir/"
              target="_blank"
              rel="noreferrer"
            >
              AgentKit → SMART App on FHIR
            </a>
            . Then add the EHR-issued client ID/secret and the Scalekit redirect URI.
          </p>
        </Section>

        <Section title="Data sources">
          <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--ink-soft)]">
            <li>
              Epic R4 endpoint bundle (~450 systems) — publicly published for patient
              access; FHIR bases are searchable here for both patient and provider
              workflows
            </li>
            <li>
              Oracle Health Millennium provider R4 endpoints (~1,400 orgs)
            </li>
            <li>Public sandboxes (Epic, Oracle Health, SMART Health IT)</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-[var(--line)] pt-6">
      <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}
