import { PSX_HIGHLIGHT_MAP, PSX_HIGHLIGHT_TO_PKR_MN } from "@/config/psx";
import type { HighlightTable } from "@/lib/integrations/psx/types";

/** Convert PSX annual highlights into per-period partial spreads (PKR mn). Pure. */
export function highlightsToSpreads(annual: HighlightTable): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [label, byPeriod] of Object.entries(annual)) {
    const map = PSX_HIGHLIGHT_MAP.find((m) => m.pattern.test(label.trim()));
    if (!map || map.key === "grossProfit") continue;
    for (const [period, v] of Object.entries(byPeriod)) {
      const year = period.match(/(19|20)\d{2}/)?.[0];
      if (!year || v == null) continue;
      const fy = `FY${year}`;
      (out[fy] ??= {})[map.key] ??= Math.round(v * PSX_HIGHLIGHT_TO_PKR_MN * 10) / 10;
    }
  }
  return out;
}
