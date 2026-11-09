import { prisma } from "@/lib/db/prisma";
import { searchSymbols, type SymbolMatch } from "./fuzzy";

type Row = { symbol: string; name: string; sectorName: string | null; source: string };

let cache: { rows: Row[]; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export function invalidateSymbolCache() {
  cache = null;
}

async function loadSymbols(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = await prisma.psxSymbol.findMany({ where: { active: true, isEtf: false }, select: { symbol: true, name: true, sectorName: true, source: true } });
  cache = { rows, at: Date.now() };
  return rows;
}

/** Fuzzy search over the active PSX symbol table (~600 rows; in-memory is fine). */
export async function searchPsx(q: string, limit = 8): Promise<SymbolMatch<Row>[]> {
  if (q.trim().length < 2) return [];
  return searchSymbols(q, await loadSymbols(), { limit });
}
