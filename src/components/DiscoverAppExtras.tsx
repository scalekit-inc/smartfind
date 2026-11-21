"use client";

export function EmbedSnippets({
  fhirBase,
  name,
  copied,
  onCopy,
}: {
  fhirBase: string;
  name: string;
  copied: string | null;
  onCopy: (label: string, text: string) => void;
}) {
  const cli = `npx smartfind search "${name}"\nnpx smartfind scalekit ${fhirBase}`;
  const js = `import { searchCatalog, discoverByFhirBase } from "smartfind";

const matches = searchCatalog({ query: "${name}", limit: 5 });
const { settings, scalekit } = await discoverByFhirBase(
  matches[0]?.fhirBase ?? "${fhirBase}"
);
// scalekit.authorizationEndpoint, tokenEndpoint, audience, ...`;
  const http = `GET /api/search?q=${encodeURIComponent(name)}&limit=5
GET /api/enrich?fhirBase=${encodeURIComponent(fhirBase)}`;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-white/70">
        Use the open-source package in Node, or call this demo’s HTTP API from your backend (not the browser — hospital FHIR hosts often block CORS).
      </p>
      <Snippet title="CLI" code={cli} label="cli" copied={copied} onCopy={onCopy} />
      <Snippet title="JavaScript package" code={js} label="js" copied={copied} onCopy={onCopy} />
      <Snippet title="HTTP API (this demo)" code={http} label="http" copied={copied} onCopy={onCopy} />
      <p className="text-xs text-white/50">
        Full developer guide:{" "}
        <a href="/developers" className="text-[var(--sand)] underline">
          /developers
        </a>
      </p>
    </div>
  );
}

export function Snippet({
  title,
  code,
  label,
  copied,
  onCopy,
}: {
  title: string;
  code: string;
  label: string;
  copied: string | null;
  onCopy: (label: string, text: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.14em] text-white/50">{title}</div>
        <button
          type="button"
          onClick={() => onCopy(label, code)}
          className="text-[11px] font-medium text-[var(--sand)] hover:underline"
        >
          {copied === label ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-[var(--sand)] whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

export function StepLabel({
  n,
  id,
  title,
}: {
  n: number;
  id: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
        {n}
      </span>
      <h2 id={id} className="font-display text-2xl font-semibold text-[var(--ink)]">
        {title}
      </h2>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ring-1 ${
        tone === "accent"
          ? "bg-[var(--accent)]/15 text-[var(--accent-deep)] ring-[var(--accent)]/30"
          : "bg-[var(--paper)] text-[var(--ink-soft)] ring-[var(--line)]"
      }`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.14em] text-white/50">
          {label}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="text-[11px] font-medium text-[var(--sand)] hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="block break-all rounded-xl bg-black/25 px-3 py-2 text-xs text-white/90">
        {value || "—"}
      </code>
    </div>
  );
}

export function displayVendor(vendor: string): string {
  const labels: Record<string, string> = {
    "oracle-health": "Oracle Health",
    epic: "Epic",
    athena: "athenahealth",
    advancedmd: "AdvancedMD",
    eclinicalworks: "eClinicalWorks",
    veradigm: "Veradigm",
    "office-ally": "Office Ally",
    nextgen: "NextGen",
    meditech: "MEDITECH",
    pointclickcare: "PointClickCare",
    "practice-fusion": "Practice Fusion",
    greenway: "Greenway",
    elation: "Elation",
    darena: "Darena",
    "smart-health-it": "SMART Health IT",
  };
  return labels[vendor] || vendor;
}
