/**
 * Fuzzy matching of borrower names / tickers against the PSX symbol table.
 * Pure and unit-tested. Used for search-as-you-type and to propose a listing
 * match when a borrower is onboarded; a person always confirms the match.
 */

const LEGAL_SUFFIXES = new Set([
  "limited", "ltd", "pvt", "private", "plc", "company", "co", "corporation", "corp", "inc", "the", "llc", "modaraba", "smc",
]);
const ABBREVIATIONS: Record<string, string> = {
  intl: "international",
  int: "international",
  mfg: "manufacturing",
  mfrs: "manufacturers",
  inds: "industries",
  ind: "industries",
  pak: "pakistan",
  pk: "pakistan",
  natl: "national",
  "&": "and",
};

/** Lowercase, strip punctuation and legal suffixes, expand common abbreviations. */
export function normalizeName(name: string): string {
  return tokens(name).join(" ");
}

export function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[().,'’\-/]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ABBREVIATIONS[t] ?? t)
    .filter((t) => !LEGAL_SUFFIXES.has(t));
}

/** Jaro-Winkler similarity in [0, 1]. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatch = new Array<boolean>(a.length).fill(false);
  const bMatch = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range), hi = Math.min(b.length - 1, i + range);
    for (let j = lo; j <= hi; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

export interface SymbolCandidate {
  symbol: string;
  name: string;
}

export type MatchType = "EXACT_TICKER" | "TICKER_PREFIX" | "EXACT_NAME" | "NAME_PREFIX" | "FUZZY_NAME";

export interface SymbolMatch<T extends SymbolCandidate = SymbolCandidate> {
  candidate: T;
  score: number;
  matchType: MatchType;
}

/** Share of query tokens that fuzzily appear in the candidate (JW ≥ 0.9, or prefix for short typed tokens). */
function tokenCoverage(q: string[], c: string[]): number {
  if (!q.length) return 0;
  let hit = 0;
  for (const qt of q) {
    if (c.some((ct) => ct === qt || (qt.length >= 3 && ct.startsWith(qt)) || jaroWinkler(qt, ct) >= 0.9)) hit++;
  }
  return hit / q.length;
}

export function scoreMatch(query: string, cand: SymbolCandidate): SymbolMatch | null {
  const raw = query.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === cand.symbol) return { candidate: cand, score: 1, matchType: "EXACT_TICKER" };

  const qn = normalizeName(raw);
  const cn = normalizeName(cand.name);
  if (qn && qn === cn) return { candidate: cand, score: 0.98, matchType: "EXACT_NAME" };

  let best: SymbolMatch | null = null;
  const consider = (score: number, matchType: MatchType) => {
    if (!best || score > best.score) best = { candidate: cand, score, matchType };
  };

  if (/^[A-Za-z0-9]{2,8}$/.test(raw) && cand.symbol.startsWith(upper)) consider(0.9 - 0.02 * (cand.symbol.length - upper.length), "TICKER_PREFIX");
  if (qn.length >= 3 && cn.startsWith(qn)) consider(0.88, "NAME_PREFIX");

  const qt = qn.split(" ").filter(Boolean);
  const ct = cn.split(" ").filter(Boolean);
  const coverage = tokenCoverage(qt, ct);
  const reverse = tokenCoverage(ct, qt);
  const fuzzy = 0.55 * coverage + 0.15 * reverse + 0.3 * jaroWinkler(qn, cn);
  consider(Math.round(fuzzy * 1000) / 1000, "FUZZY_NAME");
  return best;
}

export function searchSymbols<T extends SymbolCandidate>(query: string, candidates: T[], { limit = 10, minScore = 0.6 } = {}): SymbolMatch<T>[] {
  const out: SymbolMatch<T>[] = [];
  for (const c of candidates) {
    const m = scoreMatch(query, c);
    if (m && m.score >= minScore) out.push(m as SymbolMatch<T>);
  }
  return out.sort((a, b) => b.score - a.score || a.candidate.symbol.localeCompare(b.candidate.symbol)).slice(0, limit);
}

/** Confidence label for the UI and for whether a match can be proposed without a manual pick. */
export function matchConfidence(score: number): "HIGH" | "MEDIUM" | "LOW" {
  return score >= 0.9 ? "HIGH" : score >= 0.75 ? "MEDIUM" : "LOW";
}
