import { NextResponse } from "next/server";
import { ensureCatalog } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  try {
    const catalog = ensureCatalog();
    const vendors: Record<string, number> = {};
    for (const e of catalog.entries) {
      vendors[e.vendor] = (vendors[e.vendor] || 0) + 1;
    }
    return NextResponse.json({
      version: catalog.version,
      generatedAt: catalog.generatedAt,
      index: (catalog as { index?: string }).index,
      sources: catalog.sources,
      count: catalog.count,
      vendors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
