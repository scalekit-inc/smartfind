import Link from "next/link";
import { DiscoverApp } from "@/components/DiscoverApp";
import { ensureCatalog } from "@/lib/catalog";

export default function HomePage() {
  const catalog = ensureCatalog();

  return (
    <main className="atmosphere relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-fade" />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-5 py-5 md:max-w-3xl lg:max-w-3xl">
        <div className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
          Smartfind
        </div>
        <nav className="flex items-center gap-4 text-sm text-[var(--ink-soft)]">
          <Link href="/developers" className="font-medium text-[var(--ink)] hover:text-[var(--accent)]">
            Developers
          </Link>
          <Link href="/systems" className="hover:text-[var(--ink)]">
            Systems
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-8 pt-6 md:pt-12">
        <div className="text-left">
          <p className="animate-rise font-display text-5xl font-semibold leading-[0.95] tracking-tight text-[var(--ink)] md:text-6xl">
            Smartfind
          </p>
          <h1 className="animate-rise-delay mt-4 text-xl font-medium text-[var(--ink)] md:text-2xl">
            Find a hospital’s SMART on FHIR settings.
          </h1>
          <p className="animate-rise-delay mt-3 max-w-2xl text-base text-[var(--ink-soft)]">
            Search → pick a system → copy auth fields for your agent or app.
            Epic and Oracle Health catalogs included.
          </p>
        </div>

        <div className="mt-10">
          <DiscoverApp catalogCount={catalog.count} />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-20">
        <div
          id="package"
          className="rounded-3xl bg-[var(--ink)] px-6 py-8 text-[var(--mist)]"
        >
          <h2 className="font-display text-3xl font-semibold text-white">
            Building an app?
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Don’t scrape this UI — use the package or HTTP API. Full embed
            instructions, CLI, and Scalekit mapping are on the developers page.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/developers"
              className="rounded-full bg-[var(--sand)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              Read developer guide
            </Link>
            <a
              href="https://docs.scalekit.com/agentkit/connectors/customsmartfhir/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20"
            >
              Scalekit SMART docs
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--line)] px-5 py-8 text-center text-xs text-[var(--ink-soft)]">
        Public endpoint metadata only. Does not complete EHR client registration.
      </footer>
    </main>
  );
}
