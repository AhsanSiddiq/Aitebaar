import type { Severity } from "@/lib/domain";

/**
 * Composite Risk Score (0–10) — computed in code, never by the LLM (§10).
 * Each negative signal in the rolling window adds its impact weight, decayed
 * linearly by age; positive signals offset a fraction of that.
 */
export const COMPOSITE_SCORE_CONFIG = {
  windowDays: 90,
  impactWeights: { LOW: 1, MEDIUM: 2, HIGH: 4 } satisfies Record<Severity, number>,
  /** Weight multiplier for a signal at the far edge of the window (today = 1). */
  minDecay: 0.25,
  /** Positive signals offset this share of their weight. */
  positiveOffset: 0.5,
  watchAt: 4,
  alertAt: 7,
};

/** Status thresholds used for the portfolio Clear / Watch / Alert badge. */
export const STATUS_RULES = {
  watchOrrFrom: 6,
  alertOrrFrom: 8,
};
