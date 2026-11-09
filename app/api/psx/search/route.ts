import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/api";
import { matchConfidence } from "@/lib/psx/fuzzy";
import { searchPsx } from "@/lib/psx/search";

/** GET /api/psx/search?q=summit%20cement&limit=8 — fuzzy match on PSX ticker or company name. */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(25, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 8) || 8));
  const matches = await searchPsx(q, limit);
  return NextResponse.json({
    query: q,
    results: matches.map((m) => ({ ...m.candidate, score: m.score, matchType: m.matchType, confidence: matchConfidence(m.score) })),
  });
}
