import { PSX_CONFIG } from "@/config/psx";
import { DpsPsxClient } from "./dps-client";
import { SeedPsxSource } from "./seed-source";
import type { PsxMarketDataSource } from "./types";

export * from "./types";
export { DpsPsxClient, PsxFetchError } from "./dps-client";
export { SeedPsxSource } from "./seed-source";
export { classifyAnnouncement } from "./classify";

/** The configured PSX source: live portal ("dps") or offline demo data ("seed"). */
export function getPsxSource(override?: "dps" | "seed"): PsxMarketDataSource {
  return (override ?? PSX_CONFIG.source) === "dps" ? new DpsPsxClient() : new SeedPsxSource();
}
