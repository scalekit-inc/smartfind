import Link from "next/link";
import { ensureCatalog } from "@/lib/catalog";

export const metadata = {
  title: "Systems — Smartfind",
  description: "Sandbox and featured US FHIR systems with SMART discovery.",
};

export default function SystemsPage() {
  const catalog = ensureCatalog();
  const featured = catalog.entries.filter((e) => e.source === "sandbox");
  const sample = catalog.entries
    .filter((e) => e.persona === "provider" || e.persona === "both")
    .slice(0, 40);

  return (
    <main className="atmosphere min-h-screen">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Smartfind
        </Link>
        <h1 className="font-display mt-4 text-4xl font-semibold text-[var(--ink)]">
          Systems
        </h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Sandboxes first, then a sample of provider endpoints from the catalog (
          {catalog.count.toLocaleString()} total).
        </p>

        <h2 className="font-display mt-10 text-2xl font-semibold">Sandboxes</h2>
        <ul className="mt-4 space-y-3">
          {featured.map((e) => (
            <li key={e.id}>
              <Link
                href={`/systems/${e.id}`}
                className="block rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-[var(--line)] transition hover:bg-white"
              >
                <div className="font-medium text-[var(--ink)]">{e.name}</div>
                <div className="font-mono text-xs text-[var(--ink-soft)]">
                  {e.fhirBase}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="font-display mt-10 text-2xl font-semibold">
          Sample providers
        </h2>
        <ul className="mt-4 space-y-2">
          {sample.map((e) => (
            <li key={e.id}>
              <Link
                href={`/systems/${e.id}`}
                className="flex flex-col rounded-xl px-2 py-2 hover:bg-white/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-[var(--ink)]">{e.name}</span>
                <span className="text-xs text-[var(--ink-soft)]">
                  {e.vendor}
                  {e.state ? ` · ${e.state}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
