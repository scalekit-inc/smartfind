import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "smartfind";
import { ensureCatalog } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const catalog = ensureCatalog();
    const { searchParams } = req.nextUrl;
    const query = searchParams.get("q") || "";
    const vendor = searchParams.get("vendor") || undefined;
    const state = searchParams.get("state") || undefined;
    const persona = (searchParams.get("persona") || "provider") as
      | "provider"
      | "patient"
      | "both"
      | "any";
    const limit = Number(searchParams.get("limit") || "20");

    const matches = searchCatalog({ query, vendor, state, persona, limit });

    return NextResponse.json({
      query,
      persona,
      count: matches.length,
      catalogCount: catalog.count,
      generatedAt: catalog.generatedAt,
      matches,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
