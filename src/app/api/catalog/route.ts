import { NextResponse } from "next/server";
import { ensureCatalog } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  try {
    const catalog = ensureCatalog();
    return NextResponse.json({
      version: catalog.version,
      generatedAt: catalog.generatedAt,
      sources: catalog.sources,
      count: catalog.count,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
