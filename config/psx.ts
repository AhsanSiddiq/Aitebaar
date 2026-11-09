/**
 * PSX data-portal endpoints (Data Portal System, dps.psx.com.pk).
 *
 * These are the public endpoints the PSX website itself uses. They are not a
 * licensed API: PSX market data is PSX's property and commercial
 * redistribution requires a data licence. Before a paid pilot, either license
 * the data (PSX or a licensed redistributor) and point PSX_BASE_URL / the
 * adapter at it, or keep PSX_DATA_SOURCE=seed. See CLAUDE.md §17.
 */
export const PSX_CONFIG = {
  baseUrl: process.env.PSX_BASE_URL ?? "https://dps.psx.com.pk",
  /** "dps" fetches from PSX; "seed" stays offline on the demo symbols. */
  source: (process.env.PSX_DATA_SOURCE ?? "seed") as "dps" | "seed",
  endpoints: {
    /** JSON array of every listed symbol: { symbol, name, sectorName, isETF, isDebt }. */
    symbols: "/symbols",
    /** JSON { status, message, data: [[unixTime, close, volume, open?], ...] } — end-of-day series. */
    eod: (symbol: string) => `/timeseries/eod/${encodeURIComponent(symbol)}`,
    /** HTML company page: profile, financial highlights, ratios, announcements, payouts. */
    company: (symbol: string) => `/company/${encodeURIComponent(symbol)}`,
  },
  requestTimeoutMs: 20_000,
  /** Be polite: pause between per-company requests during a full sync. */
  delayBetweenRequestsMs: 400,
  userAgent: "Aitebaar/0.1 (credit monitoring; contact: admin of this deployment)",
  /** How far back announcements are turned into monitoring events. */
  announcementLookbackDays: 365,
};

/**
 * PSX company-page "financials" labels → spreading keys. The page shows
 * headline figures only (not full statements); anything not mapped is kept in
 * the snapshot for display. Full statements come from the results PDFs linked
 * in announcements, via AI extraction + human review (build step 3).
 */
export const PSX_HIGHLIGHT_MAP: { pattern: RegExp; key: "revenue" | "netIncome" | "totalAssets" | "equity" | "grossProfit" }[] = [
  { pattern: /^(net\s+)?(sales|revenue|turnover)/i, key: "revenue" },
  { pattern: /^(profit|loss|\(loss\)|profit\s*\/\s*\(loss\)).*after\s+tax/i, key: "netIncome" },
  { pattern: /^net\s+(profit|income)/i, key: "netIncome" },
  { pattern: /^total\s+assets/i, key: "totalAssets" },
  { pattern: /^(total\s+)?(share\s*holders'?\s+)?equity/i, key: "equity" },
];

/**
 * Assumption to verify against a live page: PSX highlight figures are in
 * PKR '000. Aitebaar stores PKR millions, so multiply by this factor.
 */
export const PSX_HIGHLIGHT_TO_PKR_MN = 1 / 1000;
