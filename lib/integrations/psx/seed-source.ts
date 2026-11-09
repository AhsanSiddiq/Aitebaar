import { BORROWERS, DEMO_PSX_SYMBOLS, PERIODS, buildSpread } from "@/prisma/seed-data";
import type { PsxCompanyData, PsxMarketDataSource, PsxPricePoint, PsxSymbolRecord } from "./types";

const DAY = 86_400_000;

/**
 * Offline PSX source built from the fictional demo book. Same interface as the
 * live client, so the sync, approvals and UI behave identically in a demo.
 */
export class SeedPsxSource implements PsxMarketDataSource {
  readonly source = "SEED";
  constructor(private readonly now = new Date()) {}

  async fetchSymbols(): Promise<PsxSymbolRecord[]> {
    return DEMO_PSX_SYMBOLS.map((s) => ({ ...s, isEtf: false, isDebt: false }));
  }

  async fetchEod(symbol: string): Promise<PsxPricePoint[]> {
    // Deterministic illustrative series: drift plus a seeded wobble; distressed names trend down.
    const b = BORROWERS.find((x) => x.ticker === symbol);
    const drift = b?.stage === 3 ? -0.004 : b?.stage === 2 ? -0.0012 : 0.0006;
    let seed = [...symbol].reduce((s, c) => s + c.charCodeAt(0), 0);
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5;
    let px = 50 + (seed % 200);
    const out: PsxPricePoint[] = [];
    for (let d = 180; d >= 0; d--) {
      const date = new Date(this.now.getTime() - d * DAY);
      if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
      px = Math.max(1, px * (1 + drift + rand() * 0.03));
      out.push({ date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), close: Math.round(px * 100) / 100, volume: Math.round(50_000 + Math.abs(rand()) * 400_000), open: null });
    }
    return out;
  }

  async fetchCompany(symbol: string): Promise<PsxCompanyData> {
    const b = BORROWERS.find((x) => x.ticker === symbol);
    const sym = DEMO_PSX_SYMBOLS.find((s) => s.symbol === symbol);
    if (!sym) throw new Error(`Unknown demo symbol ${symbol}`);
    const annual: PsxCompanyData["financials"]["annual"] = {};
    if (b) {
      // PSX shows highlights in PKR '000; demo spreads are PKR mn.
      PERIODS.forEach((p, i) => {
        const s = buildSpread(b.years[i], p.rate);
        const fy = p.period.replace("FY", "");
        (annual["Sales"] ??= {})[fy] = Math.round(s.revenue! * 1000);
        (annual["Profit after Taxation"] ??= {})[fy] = Math.round(s.netIncome! * 1000);
        (annual["Total Assets"] ??= {})[fy] = Math.round(s.totalAssets! * 1000);
        (annual["Total Equity"] ??= {})[fy] = Math.round(s.equity! * 1000);
      });
    }
    return {
      symbol,
      profile: { businessDescription: b?.description ?? `${sym.name} (illustrative).`, auditor: b?.auditor, fiscalYearEnd: "June" },
      financials: { annual, quarterly: {} },
      ratios: {},
      announcements: (b?.psx ?? []).map((e, i) => ({
        externalId: `${symbol}-seed-${i}`,
        symbol,
        type: e.type,
        date: new Date(this.now.getTime() - e.daysAgo * DAY),
        title: e.title,
        description: e.description,
        sentiment: e.sentiment,
        riskImpact: e.riskImpact,
      })),
      payouts: [],
    };
  }
}
