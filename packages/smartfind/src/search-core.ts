import type { Catalog, CatalogEntry, SearchOptions } from "./types.js";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `token` appears as its own word in normalized haystack. */
function wordMatch(hay: string, token: string): boolean {
  return new RegExp(`(?:^| )${escapeRe(token)}(?: |$)`).test(` ${hay} `);
}

function scoreEntry(entry: CatalogEntry, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const name = normalize(entry.name);
  const hay = normalize(
    [entry.name, ...(entry.aliases || []), entry.city || "", entry.state || "", entry.vendor].join(
      " ",
    ),
  );
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
    if (wordMatch(name, token)) {
      score += 10;
      continue;
    }
    if (wordMatch(hay, token)) {
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
