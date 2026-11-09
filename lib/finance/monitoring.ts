import { COMPOSITE_SCORE_CONFIG as C, STATUS_RULES } from "@/config/monitoring";
import type { BorrowerStatus, Ifrs9Stage, SbpClass, Sentiment, Severity } from "@/lib/domain";

/**
 * Early-warning maths (Module 5). Composite score is computed here in code —
 * the LLM only classifies individual items (§10).
 */

export interface Signal {
  date: Date;
  sentiment: Sentiment;
  impact: Severity;
}

export interface SignalContribution extends Signal {
  ageDays: number;
  contribution: number;
}

export function compositeRiskScore(signals: Signal[], asOf: Date = new Date()) {
  const contributions: SignalContribution[] = [];
  let raw = 0;
  for (const s of signals) {
    const ageDays = (asOf.getTime() - s.date.getTime()) / 86_400_000;
    if (ageDays < 0 || ageDays > C.windowDays) continue;
    const decay = 1 - (1 - C.minDecay) * (ageDays / C.windowDays);
    const w = C.impactWeights[s.impact] * decay;
    const contribution = s.sentiment === "NEGATIVE" ? w : s.sentiment === "POSITIVE" ? -w * C.positiveOffset : 0;
    raw += contribution;
    contributions.push({ ...s, ageDays, contribution });
  }
  const score = Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;
  return { score, contributions };
}

export interface StatusInput {
  orrGrade: number | null;
  sbpClass: SbpClass;
  stage: Ifrs9Stage;
  compositeScore: number;
}

/**
 * Portfolio badge. ALERT on impairment-level signals, WATCH on early-warning
 * signals, otherwise CLEAR. Returns the reasons so the UI can explain it.
 */
export function borrowerStatus(i: StatusInput): { status: BorrowerStatus; reasons: string[] } {
  const alert: string[] = [];
  const watch: string[] = [];
  if (["SUBSTANDARD", "DOUBTFUL", "LOSS"].includes(i.sbpClass)) alert.push(`Classified ${i.sbpClass.toLowerCase()}`);
  if (i.stage === 3) alert.push("IFRS 9 Stage 3");
  if (i.compositeScore >= C.alertAt) alert.push(`Composite risk ${i.compositeScore.toFixed(1)}`);
  if (i.orrGrade != null && i.orrGrade >= STATUS_RULES.alertOrrFrom) alert.push(`ORR ${i.orrGrade}`);
  if (alert.length) return { status: "ALERT", reasons: alert };

  if (i.sbpClass === "OAEM") watch.push("OAEM");
  if (i.stage === 2) watch.push("IFRS 9 Stage 2");
  if (i.compositeScore >= C.watchAt) watch.push(`Composite risk ${i.compositeScore.toFixed(1)}`);
  if (i.orrGrade != null && i.orrGrade >= STATUS_RULES.watchOrrFrom) watch.push(`ORR ${i.orrGrade}`);
  if (watch.length) return { status: "WATCH", reasons: watch };
  return { status: "CLEAR", reasons: [] };
}
