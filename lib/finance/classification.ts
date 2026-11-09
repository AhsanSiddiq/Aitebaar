import { orrGrade } from "@/config/grades";
import { R8_DPD_BANDS } from "@/config/regulatory";
import { SBP_CLASSES, type SbpClass } from "@/lib/domain";

/**
 * SBP R-8 classification. The final band is the WORST of:
 *   (a) time-based: days past due,
 *   (b) subjective override (permitted regardless of DPD; requires a reason),
 *   (c) internal grade (ORR → band).
 * R-9: a restructured exposure is never upgraded by the restructure itself, so
 * when `restructured` is true the prior classification acts as a floor.
 */

export function worstClass(...classes: (SbpClass | null | undefined)[]): SbpClass {
  let worst = 0;
  for (const c of classes) if (c) worst = Math.max(worst, SBP_CLASSES.indexOf(c));
  return SBP_CLASSES[worst];
}

export function classByDpd(dpd: number): SbpClass {
  for (const band of R8_DPD_BANDS) if (dpd >= band.minDpd) return band.sbpClass;
  return "REGULAR";
}

export interface ClassificationInput {
  dpd: number;
  orrGrade?: number | null;
  subjective?: { sbpClass: SbpClass; reason: string } | null;
  restructured?: boolean;
  priorClass?: SbpClass | null;
}

export interface ClassificationResult {
  sbpClass: SbpClass;
  drivers: { byDpd: SbpClass; byGrade: SbpClass | null; bySubjective: SbpClass | null; restructuredFloor: SbpClass | null };
}

export function classify(input: ClassificationInput): ClassificationResult {
  if (input.subjective && !input.subjective.reason.trim()) {
    throw new Error("A subjective classification requires a reason.");
  }
  const byDpd = classByDpd(input.dpd);
  const byGrade = input.orrGrade ? orrGrade(input.orrGrade).sbpClass : null;
  const bySubjective = input.subjective?.sbpClass ?? null;
  const restructuredFloor = input.restructured ? (input.priorClass ?? null) : null;
  return {
    sbpClass: worstClass(byDpd, byGrade, bySubjective, restructuredFloor),
    drivers: { byDpd, byGrade, bySubjective, restructuredFloor },
  };
}
