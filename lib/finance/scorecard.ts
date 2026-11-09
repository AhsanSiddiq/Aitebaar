import { FRR_COVERAGE_BANDS, FRR_LGD } from "@/config/grades";
import { FRR_GRADES, type CollateralType, type FrrGrade, type Seniority } from "@/lib/domain";

/**
 * ICRR rating engine.
 *  - ORR (obligor) scorecard: TODO(step 5) — quantitative (~60%) + qualitative
 *    (~40%) → 0–100 → grade 1–9 with component breakdown.
 *  - FRR (facility): implemented below; it drives LGD in the ECL engine.
 */

export interface FrrCollateral {
  type: CollateralType;
  fsv: number;
}

export interface FrrInput {
  ead: number;
  seniority: Seniority;
  collateral: FrrCollateral[];
}

export interface FrrResult {
  grade: FrrGrade;
  securityCoverage: number;
  baseGrade: FrrGrade;
  adjustments: string[];
  lgd: number;
}

/** Guarantees support recovery but are not tangible security: no FSV, +1 notch. */
const GUARANTEE_TYPES: CollateralType[] = ["CORPORATE_GUARANTEE", "PERSONAL_GUARANTEE"];

function notch(grade: FrrGrade, by: number): FrrGrade {
  const i = Math.min(FRR_GRADES.length - 1, Math.max(0, FRR_GRADES.indexOf(grade) + by));
  return FRR_GRADES[i];
}

export function computeFrr({ ead, seniority, collateral }: FrrInput): FrrResult {
  const tangibleFsv = collateral.filter((c) => !GUARANTEE_TYPES.includes(c.type)).reduce((s, c) => s + Math.max(0, c.fsv), 0);
  const securityCoverage = ead > 0 ? tangibleFsv / ead : 0;
  const baseGrade = FRR_COVERAGE_BANDS.find((b) => securityCoverage >= b.minCoverage)!.grade;

  let grade = baseGrade;
  const adjustments: string[] = [];
  if (collateral.some((c) => GUARANTEE_TYPES.includes(c.type))) {
    grade = notch(grade, -1);
    adjustments.push("Guarantee support: +1 notch");
  }
  if (seniority === "SUBORDINATED") {
    grade = notch(grade, +1);
    adjustments.push("Subordinated claim: −1 notch");
  }
  return { grade, securityCoverage, baseGrade, adjustments, lgd: FRR_LGD[grade] };
}
