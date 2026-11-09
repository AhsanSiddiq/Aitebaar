import { describe, expect, it } from "vitest";
import { highlightsToSpreads } from "./highlights";

describe("highlightsToSpreads", () => {
  it("maps PSX labels to spreading keys, converts '000 → mn, keys by fiscal year", () => {
    const s = highlightsToSpreads({
      Sales: { "2025": 61_000_000, "2024": 56_000_000 },
      "Profit after Taxation": { "2025": 7_925_000, "2024": null },
      "Total Assets": { "2025": 120_000_000 },
      EPS: { "2025": 31.2 },
    });
    expect(s).toEqual({
      FY2025: { revenue: 61_000, netIncome: 7_925, totalAssets: 120_000 },
      FY2024: { revenue: 56_000 },
    });
  });
});
