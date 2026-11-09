import { RATIOS, SECTOR_MEDIANS } from "@/config/ratios";
import type { Spread } from "@/config/spreading";
import type { Sector } from "@/lib/domain";

/**
 * Credit ratio engine (§6). Pure functions; every result is `number | null`
 * where null means "n/a" (missing inputs or a zero/negative denominator where
 * the ratio would be meaningless).
 */

export type RatioValues = Record<string, number | null>;

function has(...xs: (number | undefined)[]): boolean {
  return xs.every((x) => typeof x === "number" && Number.isFinite(x));
}

/** a / b, or null when inputs are missing or b is zero. */
export function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

function sum(...xs: (number | undefined)[]): number | null {
  return has(...xs) ? (xs as number[]).reduce((s, x) => s + x, 0) : null;
}

/** Derived figures shared by several ratios. */
export function deriveFigures(s: Spread) {
  const grossProfit = has(s.revenue, s.cogs) ? s.revenue! - s.cogs! : null;
  // EBIT = Revenue − COGS − SG&A − D&A + Other operating income
  const ebit = has(s.revenue, s.cogs, s.sellingAdminExpenses, s.depreciation)
    ? s.revenue! - s.cogs! - s.sellingAdminExpenses! - s.depreciation! + (s.otherIncome ?? 0)
    : null;
  const ebitda = ebit != null && has(s.depreciation) ? ebit + s.depreciation! : null;
  // Total debt = interest-bearing borrowings only (short-term + current portion + long-term).
  const totalDebt = sum(s.shortTermBorrowings ?? 0, s.currentPortionLtd ?? 0, s.longTermDebt);
  return { grossProfit, ebit, ebitda, totalDebt };
}

export function computeRatios(s: Spread): RatioValues {
  const { grossProfit, ebit, ebitda, totalDebt } = deriveFigures(s);
  const dio = safeDiv(s.inventory, s.cogs);
  const dso = safeDiv(s.receivables, s.revenue);
  const dpo = safeDiv(s.payables, s.cogs);
  const dioDays = dio == null ? null : dio * 365;
  const dsoDays = dso == null ? null : dso * 365;
  const dpoDays = dpo == null ? null : dpo * 365;

  /**
   * DSCR definition used throughout Aitebaar:
   *   DSCR = (EBITDA − Taxes paid in cash) / (Finance cost + Current portion of long-term debt)
   * Cash taxes fall back to the P&L tax charge when the cash-flow figure is absent.
   */
  const cashTaxes = s.taxesPaid ?? s.taxExpense;
  const debtService = has(s.financeCost) ? s.financeCost! + (s.currentPortionLtd ?? 0) : null;
  const dscr = ebitda != null && cashTaxes != null ? safeDiv(ebitda - cashTaxes, debtService) : null;

  const positive = (d: number | null | undefined) => (d != null && d > 0 ? d : null);

  return {
    currentRatio: safeDiv(s.currentAssets, s.currentLiabilities),
    quickRatio: has(s.currentAssets, s.inventory) ? safeDiv(s.currentAssets! - s.inventory!, s.currentLiabilities) : null,
    cashRatio: safeDiv(s.cash, s.currentLiabilities),
    netWorkingCapital: has(s.currentAssets, s.currentLiabilities) ? s.currentAssets! - s.currentLiabilities! : null,

    // Negative equity makes D/E meaningless → n/a (flagged elsewhere).
    debtToEquity: safeDiv(totalDebt, positive(s.equity)),
    debtToAssets: safeDiv(totalDebt, s.totalAssets),
    gearing: safeDiv(s.totalLiabilities, s.totalAssets),
    debtToEbitda: safeDiv(totalDebt, positive(ebitda)),

    interestCoverage: safeDiv(ebit, s.financeCost),
    ebitdaInterestCoverage: safeDiv(ebitda, s.financeCost),
    dscr,

    grossMargin: safeDiv(grossProfit, s.revenue),
    operatingMargin: safeDiv(ebit, s.revenue),
    ebitdaMargin: safeDiv(ebitda, s.revenue),
    netMargin: safeDiv(s.netIncome, s.revenue),
    roa: safeDiv(s.netIncome, s.totalAssets),
    roe: safeDiv(s.netIncome, positive(s.equity)),
    roce: has(s.totalAssets, s.currentLiabilities) ? safeDiv(ebit, s.totalAssets! - s.currentLiabilities!) : null,

    assetTurnover: safeDiv(s.revenue, s.totalAssets),
    dio: dioDays,
    dso: dsoDays,
    dpo: dpoDays,
    cashConversionCycle: dioDays != null && dsoDays != null && dpoDays != null ? dioDays + dsoDays - dpoDays : null,

    ocfRatio: safeDiv(s.operatingCashFlow, s.currentLiabilities),
    ocfToDebt: safeDiv(s.operatingCashFlow, totalDebt),
    freeCashFlow: has(s.operatingCashFlow, s.capex) ? s.operatingCashFlow! - s.capex! : null,
  };
}

export type Trend = "UP" | "DOWN" | "FLAT" | null;

/** Direction of change vs prior period. FLAT if within ±2% (relative). */
export function trend(current: number | null, prior: number | null, tolerance = 0.02): Trend {
  if (current == null || prior == null) return null;
  const base = Math.abs(prior) || 1;
  const delta = (current - prior) / base;
  if (Math.abs(delta) <= tolerance) return "FLAT";
  return delta > 0 ? "UP" : "DOWN";
}

/** Whether a trend is good for credit, given the ratio's direction. */
export function trendIsFavourable(key: string, t: Trend): boolean | null {
  const def = RATIOS.find((r) => r.key === key);
  if (!def || t == null || t === "FLAT") return null;
  return def.higherIsBetter ? t === "UP" : t === "DOWN";
}

export function sectorBenchmark(sector: Sector, key: string): number | null {
  return SECTOR_MEDIANS[sector]?.[key] ?? null;
}
