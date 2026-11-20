type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const PRUNE_EVERY_MS = 5 * 60_000;
let lastPrune = 0;

/** Drop buckets with no recent requests so the map does not grow without bound. */
function prune(now: number, windowMs: number) {
  if (now - lastPrune < PRUNE_EVERY_MS) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((t) => now - t >= windowMs)) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit = MAX_REQUESTS, windowMs = WINDOW_MS): {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
} {
  const now = Date.now();
  prune(now, windowMs);
  const bucket = buckets.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.timestamps[0] || now;
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSec: 0,
  };
}
