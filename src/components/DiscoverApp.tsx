"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { type CatalogEntry } from "@/lib/search-entries";
import { EmbedSnippets, StepLabel, Badge, Field, displayVendor } from "./DiscoverAppExtras";

type Persona = "provider" | "patient" | "both" | "any";
type VendorFilter =
  | "any"
  | "epic"
  | "oracle-health"
  | "athena"
  | "advancedmd"
  | "eclinicalworks"
  | "veradigm";

interface EnrichResult {
  entry?: CatalogEntry;
  settings: {
    fhirBase: string;
    audience: string;
    fhirServerDomain: string;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    scopesSupported?: string[];
    capabilities?: string[];
    smartConfigurationUrl: string;
    fetchedAt: string;
  };
  scalekit: {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    audience: string;
    fhirServerDomain: string;
    suggestedScopes: string[];
    notes: string[];
  };
}

type OutputTab = "fields" | "scalekit" | "embed";

export function DiscoverApp({ catalogCount }: { catalogCount: number }) {
  const [catalogMeta, setCatalogMeta] = useState<{
    count: number;
    vendors: Record<string, number>;
  } | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [persona, setPersona] = useState<Persona>("any");
  const [vendor, setVendor] = useState<VendorFilter>("any");
  const [matches, setMatches] = useState<CatalogEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [enrich, setEnrich] = useState<EnrichResult | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>("fields");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then((res) => {
        if (!res.ok) throw new Error(`Catalog HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { count: number; vendors?: Record<string, number> }) => {
        if (!cancelled) {
          setCatalogMeta({ count: data.count, vendors: data.vendors || {} });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : "Catalog failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Server-side search — avoid downloading the full multi‑MB catalog to the browser.
  useEffect(() => {
    const q = deferredQuery.trim();
    if (!q) {
      setMatches([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const params = new URLSearchParams({
      q,
      persona,
      limit: "15",
    });
    if (vendor !== "any") params.set("vendor", vendor);
    const handle = window.setTimeout(() => {
      fetch(`/api/search?${params}`)
        .then((res) => res.json())
        .then((data: { matches?: CatalogEntry[]; error?: string }) => {
          if (cancelled) return;
          if (data.error) throw new Error(data.error);
          setMatches(data.matches || []);
        })
        .catch((err) => {
          if (!cancelled) {
            setMatches([]);
            setError(err instanceof Error ? err.message : "Search failed");
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [deferredQuery, persona, vendor]);

  const vendorCounts = {
    epic: catalogMeta?.vendors.epic || 0,
    oracle: catalogMeta?.vendors["oracle-health"] || 0,
    athena: catalogMeta?.vendors.athena || 0,
    advancedmd: catalogMeta?.vendors.advancedmd || 0,
    eclinicalworks: catalogMeta?.vendors.eclinicalworks || 0,
    veradigm: catalogMeta?.vendors.veradigm || 0,
  };

  async function runEnrich(opts: { id?: string; fhirBase?: string; entry?: CatalogEntry }) {
    if (opts.entry) setSelected(opts.entry);
    setEnriching(true);
    setError(null);
    setEnrich(null);
    setOutputTab("fields");
    try {
      const params = new URLSearchParams();
      if (opts.id) params.set("id", opts.id);
      if (opts.fhirBase) params.set("fhirBase", opts.fhirBase);
      const res = await fetch(`/api/enrich?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrichment failed");
      setEnrich(data);
      // Scroll output into view on small screens
      requestAnimationFrame(() => {
        document.getElementById("smart-output")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  }

  function copy(label: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const indexed = catalogMeta?.count ?? catalogCount;
  const selectedName = selected?.name || enrich?.entry?.name || "Selected system";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* STEP 1 — INPUT */}
      <section aria-labelledby="step-search" className="space-y-3">
        <StepLabel n={1} id="step-search" title="Search" />
        <p className="text-sm text-[var(--ink-soft)]">
          Type a hospital or clinic name. Filter by EHR vendor if you already know it.
        </p>

        <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-[var(--line)] shadow-[0_16px_40px_rgba(16,36,31,0.06)]">
          <label htmlFor="hospital-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Health system name
          </label>
          <input
            id="hospital-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. CarolinaEast, Mayo, AdventHealth"
            className="w-full rounded-xl bg-[var(--mist)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-1 ring-transparent focus:ring-[var(--accent)]"
            autoComplete="off"
            autoFocus
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["any", `All vendors`],
                ["epic", `Epic (${vendorCounts.epic})`],
                ["oracle-health", `Oracle Health (${vendorCounts.oracle})`],
                ["athena", `athena (${vendorCounts.athena})`],
                ["advancedmd", `AdvancedMD (${vendorCounts.advancedmd})`],
                ["eclinicalworks", `eCW (${vendorCounts.eclinicalworks})`],
                ["veradigm", `Veradigm (${vendorCounts.veradigm})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVendor(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  vendor === value
                    ? "bg-[var(--ink)] text-white"
                    : "bg-[var(--mist)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
              Access type
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as Persona)}
                className="rounded-lg bg-[var(--mist)] px-2 py-1.5 text-xs font-medium text-[var(--ink)] outline-none"
              >
                <option value="any">Any</option>
                <option value="provider">Provider-oriented</option>
                <option value="patient">Patient-oriented</option>
                <option value="both">Both</option>
              </select>
            </label>
            <span className="text-xs text-[var(--ink-soft)]">
              {indexed.toLocaleString()} endpoints
              {!catalogMeta && !catalogError ? " · loading…" : ""}
              {searching ? " · searching…" : ""}
              {catalogError ? ` · ${catalogError}` : ""}
            </span>
          </div>
        </div>

        <details className="rounded-xl bg-white/50 px-3 py-2 text-xs text-[var(--ink-soft)] ring-1 ring-[var(--line)]">
          <summary className="cursor-pointer font-medium text-[var(--ink)]">
            Or paste a FHIR base URL
          </summary>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://fhir.example.com/r4/..."
              className="w-full flex-1 rounded-lg bg-[var(--mist)] px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              disabled={!manualUrl || enriching}
              onClick={() => {
                setSelected(null);
                void runEnrich({ fhirBase: manualUrl.trim() });
              }}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Enrich URL
            </button>
          </div>
        </details>
      </section>

      {/* STEP 2 — PICK */}
      <section aria-labelledby="step-pick" className="space-y-3">
        <StepLabel n={2} id="step-pick" title="Pick a system" />
        <p className="text-sm text-[var(--ink-soft)]">
          Click a result to fetch live SMART discovery for that FHIR base.
        </p>

        <ul className="overflow-hidden rounded-2xl bg-white/85 ring-1 ring-[var(--line)]">
          {matches.length === 0 && (
            <li className="px-4 py-8 text-sm text-[var(--ink-soft)]">
              {catalogMeta
                ? query
                  ? searching
                    ? "Searching…"
                    : "No matches. Try another name, switch vendor to All, or set access type to Any."
                  : "Start typing a health system name above."
                : "Loading catalog…"}
            </li>
          )}
          {matches.map((m) => {
            const active = selected?.id === m.id;
            return (
              <li key={m.id} className="border-b border-[var(--line)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => void runEnrich({ id: m.id, entry: m })}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                    active ? "bg-[var(--mist)]" : "hover:bg-[var(--paper)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--ink)]">{m.name}</span>
                    <Badge>{displayVendor(m.vendor)}</Badge>
                    <Badge>{m.persona}</Badge>
                    {active && <Badge tone="accent">{enriching ? "Loading…" : "Selected"}</Badge>}
                  </div>
                  <span className="truncate font-mono text-xs text-[var(--ink-soft)]">
                    {[m.city, m.state].filter(Boolean).join(", ")}
                    {m.city || m.state ? " · " : ""}
                    {m.fhirBase}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* STEP 3 — OUTPUT */}
      <section
        id="smart-output"
        aria-labelledby="step-output"
        className="space-y-3"
      >
        <StepLabel n={3} id="step-output" title="Output — SMART settings" />
        <p className="text-sm text-[var(--ink-soft)]">
          These are the values your app needs for OAuth. Copy fields, Scalekit JSON, or embed snippets below.
        </p>

        <div className="rounded-2xl bg-[var(--ink)] p-5 text-[var(--mist)] shadow-[0_20px_50px_rgba(16,36,31,0.16)]">
          {!selected && !enrich && !error && !enriching && (
            <p className="text-sm text-white/60">
              Select a system in step 2. Output appears here — not beside the list.
            </p>
          )}

          {enriching && (
            <p className="text-sm text-white/70">Fetching /.well-known/smart-configuration…</p>
          )}

          {error && (
            <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-100 ring-1 ring-red-400/30">
              {error}
            </p>
          )}

          {enrich && (
            <>
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">For</p>
                <h3 className="font-display text-2xl font-semibold text-white">
                  {selectedName}
                </h3>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ["fields", "Connection fields"],
                    ["scalekit", "Scalekit JSON"],
                    ["embed", "Embed in your app"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOutputTab(id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      outputTab === id
                        ? "bg-white text-[var(--ink)]"
                        : "bg-white/10 text-white/75 hover:bg-white/15"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {outputTab === "fields" && (
                <div className="space-y-3">
                  <Field
                    label="Audience (aud) / FHIR base"
                    value={enrich.scalekit.audience}
                    copied={copied === "aud"}
                    onCopy={() => copy("aud", enrich.scalekit.audience)}
                  />
                  <Field
                    label="Authorization endpoint"
                    value={enrich.scalekit.authorizationEndpoint}
                    copied={copied === "auth"}
                    onCopy={() => copy("auth", enrich.scalekit.authorizationEndpoint)}
                  />
                  <Field
                    label="Token endpoint"
                    value={enrich.scalekit.tokenEndpoint}
                    copied={copied === "token"}
                    onCopy={() => copy("token", enrich.scalekit.tokenEndpoint)}
                  />
                  <Field
                    label="FHIR server domain"
                    value={enrich.scalekit.fhirServerDomain}
                    copied={copied === "domain"}
                    onCopy={() => copy("domain", enrich.scalekit.fhirServerDomain)}
                  />
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.14em] text-white/50">
                      Suggested scopes
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {enrich.scalekit.suggestedScopes.map((s) => (
                        <code
                          key={s}
                          className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-[var(--sand)]"
                        >
                          {s}
                        </code>
                      ))}
                    </div>
                  </div>
                  <ul className="space-y-1.5 pt-2 text-xs text-white/55">
                    {enrich.scalekit.notes.map((n) => (
                      <li key={n}>• {n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {outputTab === "scalekit" && (
                <div className="space-y-3">
                  <p className="text-sm text-white/70">
                    Paste into Scalekit AgentKit → Connections → SMART App on FHIR, then add your EHR client ID/secret and Scalekit redirect URI.
                  </p>
                  <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-[var(--sand)]">
                    {JSON.stringify(enrich.scalekit, null, 2)}
                  </pre>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
                    onClick={() =>
                      copy("json", JSON.stringify(enrich.scalekit, null, 2))
                    }
                  >
                    {copied === "json" ? "Copied" : "Copy Scalekit JSON"}
                  </button>
                </div>
              )}

              {outputTab === "embed" && (
                <EmbedSnippets
                  fhirBase={enrich.scalekit.audience}
                  name={selectedName}
                  copied={copied}
                  onCopy={copy}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
