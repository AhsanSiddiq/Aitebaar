import { describe, expect, it } from "vitest";
import { jaroWinkler, normalizeName, scoreMatch, searchSymbols } from "./fuzzy";

const SYMBOLS = [
  { symbol: "SMTC", name: "Summit Cement Limited" },
  { symbol: "SMTX", name: "Summit Textile Mills Limited" },
  { symbol: "IFZL", name: "Indus Fertilizer Limited" },
  { symbol: "INDU", name: "Indus Motor Company Limited" },
  { symbol: "CHNC", name: "Chenab Chemicals Limited" },
  { symbol: "ZNTH", name: "Zenith Power Limited" },
  { symbol: "RVTX", name: "Ravi Textiles Limited" },
  { symbol: "NATP", name: "National Packaging Industries Ltd." },
];

describe("normalizeName", () => {
  it("strips legal suffixes, punctuation and expands abbreviations", () => {
    expect(normalizeName("Summit Cement Ltd.")).toBe("summit cement");
    expect(normalizeName("Margalla Foods (Pvt.) Limited")).toBe("margalla foods");
    expect(normalizeName("Natl. Packaging Inds & Co")).toBe("national packaging industries and");
  });
});

describe("jaroWinkler", () => {
  it("is 1 for equal strings and high for typos", () => {
    expect(jaroWinkler("cement", "cement")).toBe(1);
    expect(jaroWinkler("fertilizer", "fertiliser")).toBeGreaterThan(0.95);
    expect(jaroWinkler("abc", "xyz")).toBe(0);
  });
});

describe("scoreMatch / searchSymbols", () => {
  it("exact ticker wins", () => {
    expect(scoreMatch("smtc", SYMBOLS[0])).toMatchObject({ score: 1, matchType: "EXACT_TICKER" });
  });
  it("matches a name with different legal suffix as exact", () => {
    expect(scoreMatch("Summit Cement Ltd", SYMBOLS[0])?.matchType).toBe("EXACT_NAME");
  });
  it("handles British/US spelling and missing suffix", () => {
    const [top] = searchSymbols("Indus Fertiliser", SYMBOLS);
    expect(top.candidate.symbol).toBe("IFZL");
    expect(top.score).toBeGreaterThan(0.8);
  });
  it("ranks the right company first for a partial name", () => {
    const res = searchSymbols("summit cem", SYMBOLS);
    expect(res[0].candidate.symbol).toBe("SMTC");
  });
  it("disambiguates shared first words", () => {
    const res = searchSymbols("Indus Motor", SYMBOLS);
    expect(res[0].candidate.symbol).toBe("INDU");
  });
  it("tolerates typos", () => {
    expect(searchSymbols("Chenab Chemcals", SYMBOLS)[0].candidate.symbol).toBe("CHNC");
  });
  it("returns nothing for unrelated names", () => {
    expect(searchSymbols("Karakoram Shipping", SYMBOLS)).toEqual([]);
  });
  it("ticker prefix search", () => {
    const res = searchSymbols("SMT", SYMBOLS);
    expect(res.map((r) => r.candidate.symbol).slice(0, 2).sort()).toEqual(["SMTC", "SMTX"]);
  });
});
