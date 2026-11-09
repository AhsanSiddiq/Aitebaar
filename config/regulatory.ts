import type { SbpClass } from "@/lib/domain";

/**
 * SBP Prudential Regulations surfaced in the product.
 * Values are illustrative defaults for a corporate/commercial book and are
 * Admin-editable per tenant. TODO(step 8): tenant-level overrides in DB.
 */

/** R-1: exposure limits as a share of the lender's equity. */
export const R1_LIMITS = {
  singleBorrower: 0.25,
  group: 0.5,
  /** Flag when utilisation of a limit reaches this share. */
  warnAt: 0.8,
};

/**
 * R-8 time-based criteria (days past due) for corporate/commercial exposures.
 * Checked worst-first. Subjective downgrade is allowed regardless of DPD.
 */
export const R8_DPD_BANDS: { minDpd: number; sbpClass: SbpClass }[] = [
  { minDpd: 365, sbpClass: "LOSS" },
  { minDpd: 180, sbpClass: "DOUBTFUL" },
  { minDpd: 90, sbpClass: "SUBSTANDARD" },
  { minDpd: 60, sbpClass: "OAEM" },
  { minDpd: 0, sbpClass: "REGULAR" },
];

/**
 * R-8 provisioning: % of outstanding net of eligible FSV benefit.
 * Used for the Stage 3 two-track comparison (max of IFRS 9 ECL and PR provision).
 */
export const R8_PROVISION_RATES: Record<SbpClass, number> = {
  REGULAR: 0,
  OAEM: 0,
  SUBSTANDARD: 0.25,
  DOUBTFUL: 0.5,
  LOSS: 1,
};
