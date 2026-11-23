import type { Catalog, CatalogEntry, SearchOptions } from "./types.js";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

type Prepared = { name: string; paddedName: string; hay: string; paddedHay: string };

/** Normalized text per entry, computed once instead of on every search. */
const prepared = new WeakMap<CatalogEntry, Prepared>();

function prepare(entry: CatalogEntry): Prepared {
  let p = prepared.get(entry);
  if (!p) {
    const name = normalize(entry.name);
    const hay = normalize(
      [entry.name, ...(entry.aliases || []), entry.city || "", entry.state || "", entry.vendor].join(
        " ",
      ),
    );
    p = { name, paddedName: ` ${name} `, hay, paddedHay: ` ${hay} ` };
    prepared.set(entry, p);
  }
  return p;
}

/** True when `token` appears as its own word in a space-padded normalized string. */
function wordMatch(padded: string, token: string): boolean {
  return padded.includes(` ${token} `);
}

function scoreEntry(entry: CatalogEntry, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const { name, paddedName, hay, paddedHay } = prepare(entry);
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (name === token) {
      score += 20;
      continue;
    }
    if (name.startsWith(`${token} `) || name.startsWith(token)) {
      score += 12;
      continue;
    }
    if (wordMatch(paddedName, token)) {
      score += 10;
      continue;
    }
    if (wordMatch(paddedHay, token)) {
      score += 6;
      continue;
    }
    // Substring hits only for longer tokens (avoids "mayo" → "Tamayo").
    if (token.length >= 5 && hay.includes(token)) {
      score += 2;
      continue;
    }
    return -1;
  }
  if (entry.persona === "provider" || entry.persona === "both") score += 1;
  if (entry.source === "sandbox") score += 2;
  return score;
}

/** Pure search over a provided catalog — safe for browser and server. */
export function searchEntries(
  catalog: Catalog,
  options: SearchOptions = {},
): CatalogEntry[] {
  const {
    query = "",
    vendor,
    persona = "any",
    state,
    limit = 25,
  } = options;

  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const scored: { entry: CatalogEntry; score: number }[] = [];

  for (const entry of catalog.entries) {
    if (vendor && entry.vendor !== vendor) continue;
    if (state && (entry.state || "").toUpperCase() !== state.toUpperCase()) continue;
    if (persona && persona !== "any") {
      if (entry.persona !== persona && entry.persona !== "both") continue;
    }
    const score = scoreEntry(entry, tokens);
    if (score < 0) continue;
    if (tokens.length && score === 0) continue;
    scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, Math.max(1, Math.min(limit, 100))).map((s) => s.entry);
}
