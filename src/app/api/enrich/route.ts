import { NextRequest, NextResponse } from "next/server";
import { discoverByFhirBase, discoverById, getById } from "smartfind";
import { ensureCatalog } from "@/lib/catalog";
import { assertEnrichableFhirBase } from "@/lib/enrich-policy";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(`enrich:${clientKey(req)}`);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many enrichment requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    ensureCatalog();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const fhirBase = searchParams.get("fhirBase");

  try {
    if (id) {
      const entry = getById(id);
      if (!entry) {
        return NextResponse.json({ error: "Unknown catalog id" }, { status: 404 });
      }
      const result = await discoverById(id);
      return NextResponse.json(result, {
        headers: { "X-RateLimit-Remaining": String(limited.remaining) },
      });
    }

    if (fhirBase) {
      const safeBase = assertEnrichableFhirBase(fhirBase);
      const result = await discoverByFhirBase(safeBase);
      return NextResponse.json(result, {
        headers: { "X-RateLimit-Remaining": String(limited.remaining) },
      });
    }

    return NextResponse.json(
      { error: "Provide id or fhirBase query parameter" },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    const status =
      /not allowed|Invalid|must match|credentials|hash|hostname|Blocked/i.test(
        message,
      )
        ? 400
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
