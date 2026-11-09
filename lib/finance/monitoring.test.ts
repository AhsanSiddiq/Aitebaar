import { describe, expect, it } from "vitest";
import { borrowerStatus, compositeRiskScore } from "./monitoring";
import { computeFrr } from "./scorecard";
import { concentration } from "./concentration";

const asOf = new Date("2026-11-01T00:00:00Z");
const daysAgo = (d: number) => new Date(asOf.getTime() - d * 86_400_000);

describe("composite risk score", () => {
  it("weights by impact and decays with age", () => {
    const { score } = compositeRiskScore([{ date: daysAgo(0), sentiment: "NEGATIVE", impact: "HIGH" }], asOf);
    expect(score).toBe(4);
    const old = compositeRiskScore([{ date: daysAgo(90), sentiment: "NEGATIVE", impact: "HIGH" }], asOf);
    expect(old.score).toBe(1); // 4 × 0.25
  });
  it("ignores items outside the window and offsets positives", () => {
    const { score } = compositeRiskScore(
      [
        { date: daysAgo(0), sentiment: "NEGATIVE", impact: "MEDIUM" },
        { date: daysAgo(0), sentiment: "POSITIVE", impact: "MEDIUM" },
        { date: daysAgo(200), sentiment: "NEGATIVE", impact: "HIGH" },
      ],
      asOf,
    );
    expect(score).toBe(1); // 2 − 1
  });
  it("clamps to 0–10", () => {
    const many = Array.from({ length: 5 }, () => ({ date: daysAgo(1), sentiment: "NEGATIVE" as const, impact: "HIGH" as const }));
    expect(compositeRiskScore(many, asOf).score).toBe(10);
    expect(compositeRiskScore([{ date: daysAgo(1), sentiment: "POSITIVE", impact: "HIGH" }], asOf).score).toBe(0);
  });
});

describe("borrower status", () => {
  it("Alert on Stage 3 / classified", () => {
    expect(borrowerStatus({ orrGrade: 8, sbpClass: "SUBSTANDARD", stage: 3, compositeScore: 8 }).status).toBe("ALERT");
  });
  it("Watch on Stage 2 or elevated composite", () => {
    expect(borrowerStatus({ orrGrade: 5, sbpClass: "REGULAR", stage: 2, compositeScore: 1 }).status).toBe("WATCH");
    expect(borrowerStatus({ orrGrade: 3, sbpClass: "REGULAR", stage: 1, compositeScore: 4.5 }).status).toBe("WATCH");
  });
  it("Clear otherwise", () => {
    expect(borrowerStatus({ orrGrade: 3, sbpClass: "REGULAR", stage: 1, compositeScore: 1 })).toEqual({ status: "CLEAR", reasons: [] });
  });
});

describe("FRR", () => {
  it("grades on FSV coverage, ignoring guarantees in coverage", () => {
    const r = computeFrr({ ead: 1000, seniority: "SENIOR_SECURED", collateral: [{ type: "LAND_BUILDING", fsv: 1300 }] });
    expect(r.securityCoverage).toBeCloseTo(1.3);
    expect(r.grade).toBe("B");
    expect(r.lgd).toBe(0.15);
  });
  it("guarantee lifts one notch; subordination drops one", () => {
    expect(computeFrr({ ead: 1000, seniority: "SENIOR_SECURED", collateral: [{ type: "STOCK_RECEIVABLES", fsv: 800 }, { type: "CORPORATE_GUARANTEE", fsv: 0 }] }).grade).toBe("C");
    expect(computeFrr({ ead: 1000, seniority: "SUBORDINATED", collateral: [] }).grade).toBe("F");
  });
});

describe("R-1 concentration", () => {
  it("flags near and breach", () => {
    // Single-borrower limit = 25% × 24,000 = 6,000; warn at 80% utilisation.
    expect(concentration("BORROWER", "b", "B", 4000, 24000).level).toBe("OK");
    const near = concentration("BORROWER", "b", "B", 5000, 24000);
    expect(near.level).toBe("NEAR");
    expect(near.utilisation).toBeCloseTo(5000 / 6000);
    expect(concentration("GROUP", "g", "G", 12500, 24000).level).toBe("BREACH"); // group limit 12,000
  });
});
