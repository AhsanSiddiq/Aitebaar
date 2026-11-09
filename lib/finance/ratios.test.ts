import { describe, expect, it } from "vitest";
import { computeRatios, deriveFigures, safeDiv, trend, trendIsFavourable } from "./ratios";

const spread = {
  revenue: 1000, cogs: 600, sellingAdminExpenses: 150, depreciation: 50, otherIncome: 20,
  financeCost: 40, taxExpense: 50, netIncome: 130,
  cash: 80, receivables: 120, inventory: 150, otherCurrentAssets: 50, currentAssets: 400,
  fixedAssets: 500, otherNonCurrentAssets: 100, totalAssets: 1000,
  payables: 90, shortTermBorrowings: 100, currentPortionLtd: 60, otherCurrentLiabilities: 50, currentLiabilities: 300,
  longTermDebt: 240, otherNonCurrentLiabilities: 60, totalLiabilities: 600, equity: 400,
  operatingCashFlow: 180, capex: 70, taxesPaid: 45,
};

describe("deriveFigures", () => {
  it("derives EBIT, EBITDA and total debt", () => {
    const d = deriveFigures(spread);
    expect(d.grossProfit).toBe(400);
    expect(d.ebit).toBe(220); // 1000-600-150-50+20
    expect(d.ebitda).toBe(270);
    expect(d.totalDebt).toBe(400); // 100+60+240
  });
});

describe("computeRatios", () => {
  const r = computeRatios(spread);
  it.each([
    ["currentRatio", 400 / 300],
    ["quickRatio", 250 / 300],
    ["cashRatio", 80 / 300],
    ["netWorkingCapital", 100],
    ["debtToEquity", 1],
    ["debtToAssets", 0.4],
    ["gearing", 0.6],
    ["debtToEbitda", 400 / 270],
    ["interestCoverage", 5.5],
    ["ebitdaInterestCoverage", 6.75],
    ["dscr", (270 - 45) / (40 + 60)],
    ["grossMargin", 0.4],
    ["operatingMargin", 0.22],
    ["ebitdaMargin", 0.27],
    ["netMargin", 0.13],
    ["roa", 0.13],
    ["roe", 0.325],
    ["roce", 220 / 700],
    ["assetTurnover", 1],
    ["dio", (150 / 600) * 365],
    ["dso", (120 / 1000) * 365],
    ["dpo", (90 / 600) * 365],
    ["cashConversionCycle", (150 / 600) * 365 + (120 / 1000) * 365 - (90 / 600) * 365],
    ["ocfRatio", 0.6],
    ["ocfToDebt", 0.45],
    ["freeCashFlow", 110],
  ])("%s", (key, expected) => {
    expect(r[key]).toBeCloseTo(expected as number, 10);
  });

  it("DSCR falls back to P&L tax when cash taxes are missing", () => {
    const { taxesPaid, ...rest } = spread;
    void taxesPaid;
    expect(computeRatios(rest).dscr).toBeCloseTo((270 - 50) / 100, 10);
  });

  it("returns n/a (null) on zero denominators and missing inputs", () => {
    const z = computeRatios({ ...spread, financeCost: 0, currentLiabilities: 0 });
    expect(z.interestCoverage).toBeNull();
    expect(z.currentRatio).toBeNull();
    expect(z.ocfRatio).toBeNull();
    const m = computeRatios({ revenue: 100 });
    expect(m.grossMargin).toBeNull();
    expect(m.dscr).toBeNull();
    expect(m.cashConversionCycle).toBeNull();
  });

  it("treats negative equity / EBITDA as n/a for D/E, ROE and Debt/EBITDA", () => {
    const n = computeRatios({ ...spread, equity: -50, sellingAdminExpenses: 500 });
    expect(n.debtToEquity).toBeNull();
    expect(n.roe).toBeNull();
    expect(n.debtToEbitda).toBeNull();
  });
});

describe("helpers", () => {
  it("safeDiv guards zero and non-finite", () => {
    expect(safeDiv(1, 0)).toBeNull();
    expect(safeDiv(null, 2)).toBeNull();
    expect(safeDiv(NaN, 2)).toBeNull();
    expect(safeDiv(1, 4)).toBe(0.25);
  });
  it("trend uses a 2% flat band", () => {
    expect(trend(1.01, 1)).toBe("FLAT");
    expect(trend(1.1, 1)).toBe("UP");
    expect(trend(-0.5, -0.4)).toBe("DOWN");
    expect(trend(null, 1)).toBeNull();
  });
  it("trend favourability respects ratio direction", () => {
    expect(trendIsFavourable("currentRatio", "UP")).toBe(true);
    expect(trendIsFavourable("debtToEquity", "UP")).toBe(false);
    expect(trendIsFavourable("dso", "DOWN")).toBe(true);
  });
});
