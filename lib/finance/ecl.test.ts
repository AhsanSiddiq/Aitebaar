import { describe, expect, it } from "vitest";
import { computeEcl, ead, lifetimeLossRate, prProvision, stagePd } from "./ecl";

describe("EAD", () => {
  it("adds CCF × undrawn", () => {
    expect(ead("RUNNING_FINANCE", 1000, 600)).toBe(600 + 0.5 * 400);
    expect(ead("LETTER_OF_CREDIT", 500, 0)).toBe(100);
    expect(ead("TERM_FINANCE", 800, 900)).toBe(900); // over-drawn: no negative undrawn
  });
});

describe("PD by stage", () => {
  it("applies the SBP 0.5% floor on Stage 1 only", () => {
    expect(stagePd(1, 0.001)).toBe(0.005);
    expect(stagePd(2, 0.001)).toBe(0.001);
    expect(stagePd(1, 0.02)).toBe(0.02);
    expect(stagePd(3, 0.02)).toBe(1);
  });
});

describe("lifetime loss rate", () => {
  it("equals discounted PD for a one-year horizon", () => {
    expect(lifetimeLossRate(0.1, 1, 0.2)).toBeCloseTo(0.1 / 1.2, 12);
  });
  it("accumulates marginal defaults with survival", () => {
    const expected = 0.1 / 1.2 + (0.9 * 0.1) / 1.44;
    expect(lifetimeLossRate(0.1, 2, 0.2)).toBeCloseTo(expected, 12);
  });
});

describe("computeEcl", () => {
  it("Stage 1: 12-month, probability-weighted across scenarios", () => {
    const r = computeEcl({ stage: 1, pd12m: 0.01, lgd: 0.4, ead: 1000, yearsToMaturity: 3, eir: 0.2 });
    // weights .6/.15/.25, multipliers 1/.8/1.5 → weighted PD multiplier 1.095
    expect(r.horizon).toBe("12M");
    expect(r.ifrs9Ecl).toBeCloseTo((0.01 * 1.095 / 1.2) * 0.4 * 1000, 10);
    expect(r.finalEcl).toBe(r.ifrs9Ecl);
    expect(r.prProvision).toBeNull();
  });

  it("Stage 1 floor flows into ECL", () => {
    const r = computeEcl({ stage: 1, pd12m: 0.0003, lgd: 0.5, ead: 1000, yearsToMaturity: 1, eir: 0 });
    expect(r.pd).toBe(0.005);
    expect(r.scenarios[0].ecl).toBeCloseTo(0.005 * 0.5 * 1000, 10);
  });

  it("Stage 2 is lifetime and exceeds the 12-month figure", () => {
    const s1 = computeEcl({ stage: 1, pd12m: 0.07, lgd: 0.5, ead: 1000, yearsToMaturity: 4 });
    const s2 = computeEcl({ stage: 2, pd12m: 0.07, lgd: 0.5, ead: 1000, yearsToMaturity: 4 });
    expect(s2.horizon).toBe("LIFETIME");
    expect(s2.ifrs9Ecl).toBeGreaterThan(s1.ifrs9Ecl);
  });

  it("Stage 3 two-track takes the higher of IFRS 9 ECL and R-8 provision", () => {
    // IFRS 9: LGD × EAD = 0.2 × 1000 = 200; PR: 25% × (1000 − 0) = 250 → 250
    const a = computeEcl({ stage: 3, pd12m: 0.2, lgd: 0.2, ead: 1000, yearsToMaturity: 2, sbpClass: "SUBSTANDARD", outstanding: 1000, fsvBenefit: 0 });
    expect(a.ifrs9Ecl).toBeCloseTo(200, 10);
    expect(a.prProvision).toBe(250);
    expect(a.finalEcl).toBe(250);
    // IFRS 9: 0.5 × 1000 = 500 > PR 25% × (1000 − 600) = 100 → 500
    const b = computeEcl({ stage: 3, pd12m: 0.2, lgd: 0.5, ead: 1000, yearsToMaturity: 2, sbpClass: "SUBSTANDARD", outstanding: 1000, fsvBenefit: 600 });
    expect(b.finalEcl).toBeCloseTo(500, 10);
  });

  it("PR provision nets FSV benefit and never goes negative", () => {
    expect(prProvision("DOUBTFUL", 1000, 400)).toBe(300);
    expect(prProvision("LOSS", 100, 500)).toBe(0);
  });
});
