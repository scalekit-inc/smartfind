import Link from "next/link";
import { notFound } from "next/navigation";
import {
  discoverById,
  getById,
  smartConfigurationUrl,
} from "smartfind";
import { ensureCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureCatalog();
  const { id } = await params;
  const entry = getById(id);
  if (!entry) return { title: "System — Smartfind" };
  return {
    title: `${entry.name} SMART on FHIR settings — Smartfind`,
    description: `FHIR base, SMART discovery URL, and connection fields for ${entry.name}.`,
  };
}

export default async function SystemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureCatalog();
  const { id } = await params;
  const entry = getById(id);
  if (!entry) notFound();

  let enrichError: string | null = null;
  let scalekit = null;
  let settings = null;
  try {
    const result = await discoverById(id);
    scalekit = result.scalekit;
    settings = result.settings;
  } catch (err) {
    enrichError = err instanceof Error ? err.message : "Enrichment failed";
  }

  return (
    <main className="atmosphere min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/systems" className="text-sm text-[var(--accent)] hover:underline">
          ← Systems
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          {entry.vendor} · {entry.persona}
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold text-[var(--ink)]">
          {entry.name}
        </h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          {entry.city ? `${entry.city}, ` : ""}
          {entry.state || "US"} · source {entry.source}
        </p>

        <dl className="mt-8 space-y-4 rounded-2xl bg-white/75 p-5 ring-1 ring-[var(--line)]">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              FHIR base / aud
            </dt>
            <dd className="mt-1 break-all font-mono text-sm">{entry.fhirBase}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              SMART configuration
            </dt>
            <dd className="mt-1 break-all font-mono text-sm">
              {smartConfigurationUrl(entry.fhirBase)}
            </dd>
          </div>
          {scalekit && (
            <>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  Authorization endpoint
                </dt>
                <dd className="mt-1 break-all font-mono text-sm">
                  {scalekit.authorizationEndpoint}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  Token endpoint
                </dt>
                <dd className="mt-1 break-all font-mono text-sm">
                  {scalekit.tokenEndpoint}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  FHIR server domain
                </dt>
                <dd className="mt-1 break-all font-mono text-sm">
                  {scalekit.fhirServerDomain}
                </dd>
              </div>
            </>
          )}
          {enrichError && (
            <p className="text-sm text-red-700">
              Live enrichment unavailable: {enrichError}. You can still use the
              FHIR base above and fetch discovery yourself.
            </p>
          )}
        </dl>

        {scalekit && (
          <pre className="mt-6 overflow-x-auto rounded-2xl bg-[var(--ink)] p-4 text-xs text-[var(--sand)]">
            {JSON.stringify(scalekit, null, 2)}
          </pre>
        )}

        {settings?.fetchedAt && (
          <p className="mt-4 text-xs text-[var(--ink-soft)]">
            Fetched {settings.fetchedAt}
          </p>
        )}
      </div>
    </main>
  );
}
