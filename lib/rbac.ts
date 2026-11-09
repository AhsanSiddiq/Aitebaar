import type { Role } from "@/lib/domain";

/**
 * Role-based permissions (§3). Checked server-side on every mutating action;
 * the UI only hides what a role cannot do.
 */
export const PERMISSIONS = {
  "borrower.edit": ["RM", "ANALYST", "ADMIN"],
  "financials.upload": ["RM", "ANALYST"],
  "rating.prepare": ["ANALYST"],
  "rating.approve": ["ANALYST", "CRO"],
  "proposal.edit": ["RM", "ANALYST"],
  "proposal.signoff": ["RM", "ANALYST", "CRO"],
  "alert.action": ["RM", "ANALYST", "CRO"],
  "admin.referenceData": ["ADMIN"],
  "admin.users": ["ADMIN"],
  "admin.resetDemo": ["ADMIN"],
  "admin.psxSync": ["ADMIN"],
  "borrower.create": ["RM", "ANALYST"],
  /** Maker-checker: RM/Analyst propose a PSX listing match; Analyst/CRO approve (never their own). */
  "listing.propose": ["RM", "ANALYST"],
  "listing.approve": ["ANALYST", "CRO"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
