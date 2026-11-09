import type { FrrGrade, SbpClass } from "@/lib/domain";

/**
 * ICRR internal grade scale (ORR). 1 = strongest, 9 = loss.
 * `sbpClass` is the R-8 band the grade maps to on its own (before DPD and
 * subjective override are applied — see lib/finance/classification.ts).
 * `pd12m` is the through-the-cycle 12-month PD used by the light ECL engine.
 * Admin-editable reference data. TODO(step 8): load overrides from DB.
 */
export interface OrrGradeDef {
  grade: number;
  label: string;
  description: string;
  sbpClass: SbpClass;
  pd12m: number;
}

export const ORR_SCALE: OrrGradeDef[] = [
  { grade: 1, label: "Exceptional", description: "Exceptional capacity to meet obligations; dominant market position, very low leverage.", sbpClass: "REGULAR", pd12m: 0.0003 },
  { grade: 2, label: "Excellent", description: "Excellent financial strength and access to capital; minimal sensitivity to cycles.", sbpClass: "REGULAR", pd12m: 0.001 },
  { grade: 3, label: "Strong", description: "Strong repayment capacity; comfortable coverage and liquidity.", sbpClass: "REGULAR", pd12m: 0.0025 },
  { grade: 4, label: "Good", description: "Good repayment capacity; some sensitivity to adverse conditions.", sbpClass: "REGULAR", pd12m: 0.005 },
  { grade: 5, label: "Satisfactory", description: "Adequate capacity; moderate leverage, coverage thinner through the cycle.", sbpClass: "REGULAR", pd12m: 0.01 },
  { grade: 6, label: "Marginal", description: "Acceptable but vulnerable; close monitoring of covenants and cash flows required.", sbpClass: "REGULAR", pd12m: 0.025 },
  { grade: 7, label: "Watch", description: "Potential weaknesses that deserve management's close attention (OAEM).", sbpClass: "OAEM", pd12m: 0.07 },
  { grade: 8, label: "Substandard", description: "Well-defined weaknesses that jeopardise repayment; distinct possibility of loss.", sbpClass: "SUBSTANDARD", pd12m: 0.2 },
  { grade: 9, label: "Loss", description: "Considered uncollectible; default has occurred or is imminent.", sbpClass: "LOSS", pd12m: 1 },
];

export function orrGrade(grade: number): OrrGradeDef {
  const def = ORR_SCALE.find((g) => g.grade === grade);
  if (!def) throw new Error(`Unknown ORR grade ${grade}`);
  return def;
}

/**
 * FRR: security coverage (FSV of collateral / EAD) → grade, and grade → LGD.
 * Thresholds are minimum coverage for the grade, checked top-down.
 */
export const FRR_COVERAGE_BANDS: { grade: FrrGrade; minCoverage: number }[] = [
  { grade: "A", minCoverage: 1.5 },
  { grade: "B", minCoverage: 1.2 },
  { grade: "C", minCoverage: 1.0 },
  { grade: "D", minCoverage: 0.75 },
  { grade: "E", minCoverage: 0.4 },
  { grade: "F", minCoverage: 0 },
];

export const FRR_LGD: Record<FrrGrade, number> = { A: 0.05, B: 0.15, C: 0.25, D: 0.35, E: 0.45, F: 0.6 };

export const FRR_DESCRIPTIONS: Record<FrrGrade, string> = {
  A: "Fully and comfortably secured; minimal loss severity.",
  B: "Well secured; low loss severity.",
  C: "Adequately secured; moderate loss severity.",
  D: "Partially secured; meaningful loss severity.",
  E: "Thinly secured; high loss severity.",
  F: "Largely unsecured or subordinated; very high loss severity.",
};

/**
 * Aggregate scorecard score (0–100) → ORR grade. Minimum score per grade,
 * checked top-down. Used by the ORR scorecard (step 5) and by seed data.
 */
export const ORR_SCORE_BANDS: { grade: number; minScore: number }[] = [
  { grade: 1, minScore: 90 },
  { grade: 2, minScore: 82 },
  { grade: 3, minScore: 74 },
  { grade: 4, minScore: 66 },
  { grade: 5, minScore: 58 },
  { grade: 6, minScore: 50 },
  { grade: 7, minScore: 40 },
  { grade: 8, minScore: 28 },
  { grade: 9, minScore: 0 },
];

/** Weight of the quantitative sub-score in the ORR aggregate (§7: ~60/40). */
export const ORR_QUANT_WEIGHT = 0.6;

export function gradeFromScore(score: number): number {
  return ORR_SCORE_BANDS.find((b) => score >= b.minScore)!.grade;
}
