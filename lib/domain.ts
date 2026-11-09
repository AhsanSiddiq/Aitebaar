/**
 * Domain vocabulary shared by DB, finance engines, and UI.
 *
 * Stored as strings in the DB (SQLite has no native enums and this keeps the
 * schema portable to Postgres); these unions are the source of truth and every
 * write goes through Zod using the arrays below.
 */

export const ROLES = ["RM", "ANALYST", "CRO", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  RM: "Relationship Manager",
  ANALYST: "Credit Analyst / Risk Officer",
  CRO: "Chief Risk Officer",
  ADMIN: "Admin",
};

/** SBP Prudential Regulation R-8 classification bands, ordered best → worst. */
export const SBP_CLASSES = ["REGULAR", "OAEM", "SUBSTANDARD", "DOUBTFUL", "LOSS"] as const;
export type SbpClass = (typeof SBP_CLASSES)[number];
export const SBP_CLASS_LABELS: Record<SbpClass, string> = {
  REGULAR: "Regular",
  OAEM: "OAEM",
  SUBSTANDARD: "Substandard",
  DOUBTFUL: "Doubtful",
  LOSS: "Loss",
};

export const IFRS9_STAGES = [1, 2, 3] as const;
export type Ifrs9Stage = (typeof IFRS9_STAGES)[number];

/** FRR grades: facility loss severity (LGD proxy). A = lowest loss severity. */
export const FRR_GRADES = ["A", "B", "C", "D", "E", "F"] as const;
export type FrrGrade = (typeof FRR_GRADES)[number];

export const BORROWER_STATUSES = ["CLEAR", "WATCH", "ALERT"] as const;
export type BorrowerStatus = (typeof BORROWER_STATUSES)[number];

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const SECTORS = ["CEMENT", "FERTILISER", "CHEMICALS", "POWER", "TEXTILE", "SHIPPING", "FMCG"] as const;
export type Sector = (typeof SECTORS)[number];
export const SECTOR_LABELS: Record<Sector, string> = {
  CEMENT: "Cement",
  FERTILISER: "Fertiliser",
  CHEMICALS: "Chemicals",
  POWER: "Power",
  TEXTILE: "Textile",
  SHIPPING: "Shipping",
  FMCG: "FMCG",
};

export const FACILITY_TYPES = ["RUNNING_FINANCE", "TERM_FINANCE", "LETTER_OF_CREDIT", "GUARANTEE", "LEASE"] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];
export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  RUNNING_FINANCE: "Running Finance",
  TERM_FINANCE: "Term Finance",
  LETTER_OF_CREDIT: "Letter of Credit",
  GUARANTEE: "Bank Guarantee",
  LEASE: "Lease Finance",
};

export const SENIORITIES = ["SENIOR_SECURED", "SENIOR_UNSECURED", "SUBORDINATED"] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const COLLATERAL_TYPES = [
  "LAND_BUILDING",
  "PLANT_MACHINERY",
  "STOCK_RECEIVABLES",
  "LISTED_SHARES",
  "CASH_MARGIN",
  "CORPORATE_GUARANTEE",
  "PERSONAL_GUARANTEE",
] as const;
export type CollateralType = (typeof COLLATERAL_TYPES)[number];

export const CHARGE_TYPES = ["EXCLUSIVE", "FIRST_PARI_PASSU", "RANKING", "HYPOTHECATION", "PLEDGE", "LIEN"] as const;
export type ChargeType = (typeof CHARGE_TYPES)[number];

/** Notes-to-the-accounts red-flag categories (Module 2). */
export const NOTES_FLAG_CATEGORIES = [
  "CONTINGENT_LIABILITY",
  "PLEDGED_ASSETS",
  "GOING_CONCERN",
  "COVENANT_BREACH",
  "RELATED_PARTY",
  "LITIGATION",
  "AUDITOR_QUALIFICATION",
  "SUBSEQUENT_EVENT",
] as const;
export type NotesFlagCategory = (typeof NOTES_FLAG_CATEGORIES)[number];

/** PSX announcement types tracked for listed borrowers (Module 5). */
export const EXCHANGE_EVENT_TYPES = [
  "DIVIDEND",
  "BOARD_CHANGE",
  "MANAGEMENT_CHANGE",
  "DEFAULT",
  "PENALTY",
  "MATERIAL_INFO",
  "RESULTS",
] as const;
export type ExchangeEventType = (typeof EXCHANGE_EVENT_TYPES)[number];

export const ALERT_TYPES = [
  "RATING_DOWNGRADE",
  "STAGE_MIGRATION",
  "HIGH_IMPACT_NEWS",
  "EXCHANGE_EVENT",
  "COVENANT_BREACH",
  "EXPOSURE_LIMIT",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  RATING_DOWNGRADE: "Rating downgrade",
  STAGE_MIGRATION: "Stage migration",
  HIGH_IMPACT_NEWS: "High-impact news",
  EXCHANGE_EVENT: "PSX announcement",
  COVENANT_BREACH: "Covenant breach",
  EXPOSURE_LIMIT: "Exposure limit (R-1)",
};

export const ALERT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
