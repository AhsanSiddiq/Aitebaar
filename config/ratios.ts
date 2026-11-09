import type { Sector } from "@/lib/domain";

/**
 * Ratio definitions, display metadata and scoring thresholds — one editable
 * module (§6). Formulas live in lib/finance/ratios.ts and are keyed by `key`.
 *
 * `bands` are the minimum (higherIsBetter) or maximum (lower is better) value
 * for strong / adequate / weak; anything beyond weak is poor. Only ratios with
 * bands feed the ORR quantitative sub-score (step 5).
 */
export type RatioGroup = "LIQUIDITY" | "LEVERAGE" | "COVERAGE" | "PROFITABILITY" | "EFFICIENCY" | "CASH_FLOW";
export type RatioFormat = "x" | "pct" | "days" | "pkr";

export interface RatioDef {
  key: string;
  label: string;
  group: RatioGroup;
  format: RatioFormat;
  higherIsBetter: boolean;
  formula: string;
  bands?: { strong: number; adequate: number; weak: number };
}

export const RATIO_GROUP_LABELS: Record<RatioGroup, string> = {
  LIQUIDITY: "Liquidity",
  LEVERAGE: "Leverage & solvency",
  COVERAGE: "Coverage & debt service",
  PROFITABILITY: "Profitability",
  EFFICIENCY: "Efficiency",
  CASH_FLOW: "Cash flow",
};

export const RATIOS: RatioDef[] = [
  { key: "currentRatio", label: "Current ratio", group: "LIQUIDITY", format: "x", higherIsBetter: true, formula: "Current assets / Current liabilities", bands: { strong: 1.5, adequate: 1.2, weak: 1.0 } },
  { key: "quickRatio", label: "Quick ratio", group: "LIQUIDITY", format: "x", higherIsBetter: true, formula: "(Current assets − Inventory) / Current liabilities", bands: { strong: 1.0, adequate: 0.8, weak: 0.6 } },
  { key: "cashRatio", label: "Cash ratio", group: "LIQUIDITY", format: "x", higherIsBetter: true, formula: "Cash & equivalents / Current liabilities" },
  { key: "netWorkingCapital", label: "Net working capital", group: "LIQUIDITY", format: "pkr", higherIsBetter: true, formula: "Current assets − Current liabilities" },

  { key: "debtToEquity", label: "Debt-to-equity", group: "LEVERAGE", format: "x", higherIsBetter: false, formula: "Total debt / Equity", bands: { strong: 0.5, adequate: 1.0, weak: 2.0 } },
  { key: "debtToAssets", label: "Debt-to-assets", group: "LEVERAGE", format: "pct", higherIsBetter: false, formula: "Total debt / Total assets" },
  { key: "gearing", label: "Gearing", group: "LEVERAGE", format: "pct", higherIsBetter: false, formula: "Total liabilities / Total assets", bands: { strong: 0.4, adequate: 0.6, weak: 0.75 } },
  { key: "debtToEbitda", label: "Debt / EBITDA", group: "LEVERAGE", format: "x", higherIsBetter: false, formula: "Total debt / EBITDA", bands: { strong: 2.0, adequate: 3.5, weak: 5.0 } },

  { key: "interestCoverage", label: "Interest cover (ICR)", group: "COVERAGE", format: "x", higherIsBetter: true, formula: "EBIT / Finance cost", bands: { strong: 4.0, adequate: 2.0, weak: 1.2 } },
  { key: "ebitdaInterestCoverage", label: "EBITDA interest cover", group: "COVERAGE", format: "x", higherIsBetter: true, formula: "EBITDA / Finance cost" },
  { key: "dscr", label: "DSCR", group: "COVERAGE", format: "x", higherIsBetter: true, formula: "(EBITDA − Taxes paid) / (Finance cost + Current portion of LTD)", bands: { strong: 1.75, adequate: 1.25, weak: 1.0 } },

  { key: "grossMargin", label: "Gross margin", group: "PROFITABILITY", format: "pct", higherIsBetter: true, formula: "(Revenue − COGS) / Revenue" },
  { key: "operatingMargin", label: "Operating margin", group: "PROFITABILITY", format: "pct", higherIsBetter: true, formula: "EBIT / Revenue" },
  { key: "ebitdaMargin", label: "EBITDA margin", group: "PROFITABILITY", format: "pct", higherIsBetter: true, formula: "EBITDA / Revenue", bands: { strong: 0.2, adequate: 0.12, weak: 0.06 } },
  { key: "netMargin", label: "Net margin", group: "PROFITABILITY", format: "pct", higherIsBetter: true, formula: "Net income / Revenue" },
  { key: "roa", label: "Return on assets", group: "PROFITABILITY", format: "pct", higherIsBetter: true, formula: "Net income / Total assets" },
  { key: "roe", label: "Return on equity", group: "PROFITABILITY", format: "pct", higherIsBetter: true, formula: "Net income / Equity", bands: { strong: 0.15, adequate: 0.08, weak: 0.0 } },
  { key: "roce", label: "ROCE", group: "PROFITABILITY", format: "pct", higherIsBetter: true, formula: "EBIT / (Total assets − Current liabilities)" },

  { key: "assetTurnover", label: "Asset turnover", group: "EFFICIENCY", format: "x", higherIsBetter: true, formula: "Revenue / Total assets" },
  { key: "dio", label: "Days inventory (DIO)", group: "EFFICIENCY", format: "days", higherIsBetter: false, formula: "Inventory / COGS × 365" },
  { key: "dso", label: "Days sales (DSO)", group: "EFFICIENCY", format: "days", higherIsBetter: false, formula: "Receivables / Revenue × 365" },
  { key: "dpo", label: "Days payables (DPO)", group: "EFFICIENCY", format: "days", higherIsBetter: true, formula: "Payables / COGS × 365" },
  { key: "cashConversionCycle", label: "Cash conversion cycle", group: "EFFICIENCY", format: "days", higherIsBetter: false, formula: "DIO + DSO − DPO" },

  { key: "ocfRatio", label: "OCF ratio", group: "CASH_FLOW", format: "x", higherIsBetter: true, formula: "Operating cash flow / Current liabilities" },
  { key: "ocfToDebt", label: "OCF / total debt", group: "CASH_FLOW", format: "pct", higherIsBetter: true, formula: "Operating cash flow / Total debt", bands: { strong: 0.3, adequate: 0.15, weak: 0.05 } },
  { key: "freeCashFlow", label: "Free cash flow", group: "CASH_FLOW", format: "pkr", higherIsBetter: true, formula: "Operating cash flow − Capex" },
];

/**
 * Sector medians for benchmarking (illustrative, FY2025). Only a subset of
 * ratios is benchmarked. TODO: replace with licensed-feed medians (§11).
 */
export const SECTOR_MEDIANS: Record<Sector, Record<string, number>> = {
  CEMENT: { currentRatio: 1.25, debtToEquity: 0.55, debtToEbitda: 1.8, interestCoverage: 4.2, dscr: 1.9, ebitdaMargin: 0.27, netMargin: 0.11, roe: 0.14, dso: 9, cashConversionCycle: 35 },
  FERTILISER: { currentRatio: 1.15, debtToEquity: 0.45, debtToEbitda: 1.2, interestCoverage: 8.5, dscr: 2.6, ebitdaMargin: 0.3, netMargin: 0.16, roe: 0.32, dso: 6, cashConversionCycle: 20 },
  CHEMICALS: { currentRatio: 1.4, debtToEquity: 0.6, debtToEbitda: 2.0, interestCoverage: 4.5, dscr: 1.8, ebitdaMargin: 0.18, netMargin: 0.08, roe: 0.15, dso: 38, cashConversionCycle: 70 },
  POWER: { currentRatio: 1.3, debtToEquity: 0.9, debtToEbitda: 3.0, interestCoverage: 3.0, dscr: 1.4, ebitdaMargin: 0.32, netMargin: 0.12, roe: 0.18, dso: 160, cashConversionCycle: 150 },
  TEXTILE: { currentRatio: 1.1, debtToEquity: 1.1, debtToEbitda: 3.8, interestCoverage: 2.0, dscr: 1.2, ebitdaMargin: 0.1, netMargin: 0.03, roe: 0.07, dso: 55, cashConversionCycle: 120 },
  SHIPPING: { currentRatio: 1.1, debtToEquity: 1.2, debtToEbitda: 3.5, interestCoverage: 2.5, dscr: 1.3, ebitdaMargin: 0.28, netMargin: 0.07, roe: 0.09, dso: 45, cashConversionCycle: 40 },
  FMCG: { currentRatio: 1.2, debtToEquity: 0.5, debtToEbitda: 1.5, interestCoverage: 6.0, dscr: 2.2, ebitdaMargin: 0.15, netMargin: 0.07, roe: 0.25, dso: 15, cashConversionCycle: 30 },
};
