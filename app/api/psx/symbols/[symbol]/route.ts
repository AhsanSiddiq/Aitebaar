import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";

/** GET /api/psx/symbols/SMTC — symbol, latest company snapshot and recent EOD prices. */
export async function GET(_req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const { symbol } = await params;
  const sym = await prisma.psxSymbol.findUnique({ where: { symbol: symbol.toUpperCase() } });
  if (!sym) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  const [snapshot, prices] = await Promise.all([
    prisma.psxCompanySnapshot.findFirst({ where: { symbol: sym.symbol }, orderBy: { fetchedAt: "desc" } }),
    prisma.psxPrice.findMany({ where: { symbol: sym.symbol }, orderBy: { date: "desc" }, take: 60 }),
  ]);
  return NextResponse.json({
    symbol: sym,
    snapshot: snapshot ? { fetchedAt: snapshot.fetchedAt, source: snapshot.source, ...JSON.parse(snapshot.data) } : null,
    prices: prices.reverse(),
  });
}
