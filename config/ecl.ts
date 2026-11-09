import type { FacilityType } from "@/lib/domain";

/** Light IFRS 9 engine parameters (§4.5, §7). Admin-editable. */
export const ECL_CONFIG = {
  /** SBP minimum 12-month PD on any Stage 1 exposure. */
  stage1PdFloor: 0.005,
  /** Credit conversion factors applied to the undrawn portion of a facility. */
  ccf: {
    RUNNING_FINANCE: 0.5,
    TERM_FINANCE: 1,
    LETTER_OF_CREDIT: 0.2,
    GUARANTEE: 0.5,
    LEASE: 1,
  } satisfies Record<FacilityType, number>,
  /** Probability-weighted macro scenarios; weights must sum to 1. */
  scenarios: [
    { key: "base", label: "Base", weight: 0.6, pdMultiplier: 1 },
    { key: "upside", label: "Upside", weight: 0.15, pdMultiplier: 0.8 },
    { key: "downside", label: "Downside", weight: 0.25, pdMultiplier: 1.5 },
  ],
  /** Fallback discount rate if a facility has no effective interest rate. */
  defaultEir: 0.2,
};

/** SICR triggers (Stage 1 → 2). Configurable per §4.5. */
export const SICR_TRIGGERS = {
  orrNotchDowngrade: 2,
  dpd: 30,
  covenantBreach: true,
  watchList: true,
};
