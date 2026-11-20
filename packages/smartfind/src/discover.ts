import { getByFhirBase, getById, searchCatalog } from "./catalog.js";
import { enrichFhirBase } from "./enrich.js";
import { toScalekitConnection } from "./scalekit.js";
import type { DiscoverResult, SearchOptions } from "./types.js";

export async function discoverByFhirBase(
  fhirBase: string,
  init?: RequestInit,
): Promise<DiscoverResult> {
  const entry = getByFhirBase(fhirBase);
  const settings = await enrichFhirBase(fhirBase, entry, init);
  return {
    entry,
    settings,
    scalekit: toScalekitConnection(settings),
  };
}

export async function discoverById(
  id: string,
  init?: RequestInit,
): Promise<DiscoverResult> {
  const entry = getById(id);
  if (!entry) {
    throw new Error(`Unknown catalog id: ${id}`);
  }
  const settings = await enrichFhirBase(entry.fhirBase, entry, init);
  return {
    entry,
    settings,
    scalekit: toScalekitConnection(settings),
  };
}

export async function discoverSearch(
  options: SearchOptions,
  init?: RequestInit,
): Promise<{ results: DiscoverResult[]; matches: number }> {
  const matches = searchCatalog(options);
  if (!matches.length) {
    return { results: [], matches: 0 };
  }
  // Enrich only the top hit by default for CLI snappiness; callers can enrich others.
  const top = matches[0];
  const settings = await enrichFhirBase(top.fhirBase, top, init);
  return {
    matches: matches.length,
    results: [
      {
        entry: top,
        settings,
        scalekit: toScalekitConnection(settings),
      },
    ],
  };
}
