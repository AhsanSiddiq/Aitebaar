import { ECL_CONFIG } from "@/config/ecl";
import { R8_PROVISION_RATES } from "@/config/regulatory";
import type { FacilityType, Ifrs9Stage, SbpClass } from "@/lib/domain";

/**
 * Light, transparent IFRS 9 ECL engine (§4.5, §7). Full engine + UI is v1;
 * this is the core math so seed data and later screens agree.
 *
 * Steps: stage → PD (ORR table; 0.5% floor on Stage 1; 100% on Stage 3)
 *        → LGD (from FRR) → EAD (outstanding + CCF × undrawn)
 *        → per-scenario ECL (12-month for Stage 1, lifetime for 2/3, discounted at EIR)
 *        → probability-weight → Stage 3: max(IFRS 9 ECL, R-8 provision).
 */

export function ead(type: FacilityType, sanctioned: number, outstanding: number): number {
  const undrawn = Math.max(0, sanctioned - outstanding);
  return outstanding + ECL_CONFIG.ccf[type] * undrawn;
}

export function stagePd(stage: Ifrs9Stage, pd12m: number): number {
  if (stage === 3) return 1;
  if (stage === 1) return Math.max(pd12m, ECL_CONFIG.stage1PdFloor);
  return pd12m;
}

/**
 * Lifetime ECL with a constant annual PD and constant EAD (no amortisation —
 * TODO(v1): amortising EAD profile per facility). Year-t marginal default
 * probability = survival(t−1) × PD; discounted at (1+EIR)^−t (mid-year ignored).
 */
export function lifetimeLossRate(pdAnnual: number, years: number, eir: number): number {
  const n = Math.max(1, Math.ceil(years));
  let survival = 1;
  let total = 0;
  for (let t = 1; t <= n; t++) {
    const marginal = survival * pdAnnual;
    total += marginal / Math.pow(1 + eir, t);
    survival *= 1 - pdAnnual;
  }
  return total;
}

export interface EclInput {
  stage: Ifrs9Stage;
  pd12m: number;
  lgd: number;
  ead: number;
  yearsToMaturity: number;
  eir?: number;
  /** Stage 3 two-track inputs. */
  sbpClass?: SbpClass;
  outstanding?: number;
  fsvBenefit?: number;
}

export interface ScenarioEcl {
  key: string;
  label: string;
  weight: number;
  pd: number;
  ecl: number;
}

export interface EclResult {
  stage: Ifrs9Stage;
  pd: number;
  lgd: number;
  ead: number;
  horizon: "12M" | "LIFETIME";
  scenarios: ScenarioEcl[];
  ifrs9Ecl: number;
  prProvision: number | null;
  finalEcl: number;
}

/** R-8 provision for the two-track comparison: rate × max(0, outstanding − FSV benefit). */
export function prProvision(sbpClass: SbpClass, outstanding: number, fsvBenefit: number): number {
  return R8_PROVISION_RATES[sbpClass] * Math.max(0, outstanding - fsvBenefit);
}

export function computeEcl(input: EclInput): EclResult {
  const eir = input.eir ?? ECL_CONFIG.defaultEir;
  const basePd = stagePd(input.stage, input.pd12m);
  const horizon = input.stage === 1 ? "12M" : "LIFETIME";

  const scenarios: ScenarioEcl[] = ECL_CONFIG.scenarios.map((s) => {
    // Stage 3 is already in default: PD = 100% in every scenario.
    const pd = input.stage === 3 ? 1 : Math.min(1, basePd * s.pdMultiplier);
    const lossRate =
      input.stage === 3 ? 1 : horizon === "12M" ? pd / (1 + eir) : lifetimeLossRate(pd, input.yearsToMaturity, eir);
    return { key: s.key, label: s.label, weight: s.weight, pd, ecl: lossRate * input.lgd * input.ead };
  });

  const ifrs9Ecl = scenarios.reduce((acc, s) => acc + s.weight * s.ecl, 0);
  let pr: number | null = null;
  let finalEcl = ifrs9Ecl;
  if (input.stage === 3) {
    pr = prProvision(input.sbpClass ?? "SUBSTANDARD", input.outstanding ?? input.ead, input.fsvBenefit ?? 0);
    finalEcl = Math.max(ifrs9Ecl, pr);
  }
  return { stage: input.stage, pd: basePd, lgd: input.lgd, ead: input.ead, horizon, scenarios, ifrs9Ecl, prProvision: pr, finalEcl };
}
