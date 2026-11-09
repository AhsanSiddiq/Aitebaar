import { R1_LIMITS } from "@/config/regulatory";

/** R-1 exposure-limit utilisation for a borrower or a group. */
export interface ConcentrationRow {
  id: string;
  name: string;
  kind: "BORROWER" | "GROUP";
  exposure: number;
  limit: number;
  /** exposure / equity */
  shareOfEquity: number;
  /** exposure / limit */
  utilisation: number;
  level: "OK" | "NEAR" | "BREACH";
}

export function concentration(
  kind: "BORROWER" | "GROUP",
  id: string,
  name: string,
  exposure: number,
  lenderEquity: number,
): ConcentrationRow {
  const limitShare = kind === "BORROWER" ? R1_LIMITS.singleBorrower : R1_LIMITS.group;
  const limit = lenderEquity * limitShare;
  const utilisation = limit > 0 ? exposure / limit : 0;
  const level = utilisation > 1 ? "BREACH" : utilisation >= R1_LIMITS.warnAt ? "NEAR" : "OK";
  return { id, name, kind, exposure, limit, shareOfEquity: lenderEquity > 0 ? exposure / lenderEquity : 0, utilisation, level };
}
