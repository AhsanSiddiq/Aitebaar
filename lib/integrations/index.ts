/**
 * Integration seams (§11). v0 runs on seed data and uploads; each interface
 * here is what a live integration will implement later without UI changes.
 */
import type { Spread } from "@/config/spreading";

/** Credit bureau (Tasdeeq): conduct, DPD and cross-lender exposure → ORR qualitative + SICR. */
export interface BureauAdapter {
  fetchReport(cnicOrNtn: string): Promise<{
    maxDpd12m: number;
    totalExposureAllLenders: number;
    defaults: { lender: string; amount: number; date: Date }[];
  }>;
}

/** Financial-statement feed (licensed PSX redistributor) for listed borrowers. */
export interface FinancialsFeedAdapter {
  fetchStatements(symbol: string): Promise<{ period: string; periodEnd: Date; spread: Spread; notesText?: string }[]>;
}

/** External ECL engine (e.g. FineIT): when present, Aitebaar displays rather than computes. */
export interface ExternalEclAdapter {
  fetchFacilityEcl(facilityRef: string): Promise<{ stage: 1 | 2 | 3; pd: number; lgd: number; ead: number; ecl: number; asOf: Date }>;
}

/** Core-banking / LOS import: loan book and DPD (CSV first, API later). */
export interface CoreBankingAdapter {
  importLoanBook(): Promise<{ facilityRef: string; outstanding: number; dpd: number; asOf: Date }[]>;
}

export * from "./exchange";
