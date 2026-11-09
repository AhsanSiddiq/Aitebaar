import type { ExchangeEventType, Sentiment, Severity } from "@/lib/domain";

/**
 * Exchange-announcement ingestion seam (Module 5, §11).
 *
 * Listed borrowers trade on PSX. Live PSX announcement data needs a licence
 * (e.g. via a licensed redistributor such as Sarmaaya), so v0 ships a seed
 * adapter. A licensed adapter implements the same interface; nothing in the
 * UI or DB layer changes. Do NOT scrape (§17).
 */
export interface ExchangeAnnouncement {
  /** Provider's id, used to de-duplicate on re-ingest. */
  externalId: string;
  symbol: string;
  type: ExchangeEventType;
  date: Date;
  title: string;
  description: string;
  /** Classification may come from the provider, from rules, or from the LLM (§10), always reviewable. */
  sentiment: Sentiment;
  riskImpact: Severity;
}

export interface ExchangeFeedAdapter {
  readonly exchange: "PSX";
  readonly source: string;
  fetchAnnouncements(symbol: string, since: Date): Promise<ExchangeAnnouncement[]>;
}

// Implementations: lib/integrations/psx (DpsPsxClient for the PSX data portal, SeedPsxSource offline).
