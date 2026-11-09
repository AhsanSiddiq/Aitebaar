import type { ExchangeAnnouncement } from "@/lib/integrations/exchange";

export interface PsxSymbolRecord {
  symbol: string;
  name: string;
  sectorName: string | null;
  isEtf: boolean;
  isDebt: boolean;
}

export interface PsxPricePoint {
  date: Date;
  close: number;
  volume: number | null;
  open: number | null;
}

/** A label → { period → value } table, as shown on the PSX company page. */
export type HighlightTable = Record<string, Record<string, number | null>>;

export interface PsxCompanyData {
  symbol: string;
  profile: { businessDescription?: string; keyPeople?: { name: string; role: string }[]; address?: string; website?: string; auditor?: string; fiscalYearEnd?: string };
  financials: { annual: HighlightTable; quarterly: HighlightTable };
  ratios: HighlightTable;
  announcements: ExchangeAnnouncement[];
  payouts: { date: string; details: string }[];
}

/** Everything Aitebaar needs from PSX. DPS implements it now; a licensed feed later. */
export interface PsxMarketDataSource {
  readonly source: "DPS" | "SEED" | string;
  fetchSymbols(): Promise<PsxSymbolRecord[]>;
  fetchEod(symbol: string): Promise<PsxPricePoint[]>;
  fetchCompany(symbol: string): Promise<PsxCompanyData>;
}
