import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCompanyHtml, parseDate, parseEod, parseNumber, parseSymbols } from "./parsers";
import { classifyAnnouncement } from "./classify";
import { DpsPsxClient } from "./dps-client";

// NOTE: fixtures are hand-written to the documented shape of the PSX data portal.
// Re-check against a live response (npm run psx:sync -- --probe) when network access is available.

describe("parseSymbols", () => {
  it("maps portal rows and skips malformed ones", () => {
    const rows = parseSymbols([
      { symbol: "smtc ", name: "Summit Cement Limited", sectorName: "CEMENT", isETF: false, isDebt: false },
      { symbol: "XETF", name: "Some ETF", isETF: true },
      { name: "no symbol" },
    ]);
    expect(rows).toEqual([
      { symbol: "SMTC", name: "Summit Cement Limited", sectorName: "CEMENT", isEtf: false, isDebt: false },
      { symbol: "XETF", name: "Some ETF", sectorName: null, isEtf: true, isDebt: false },
    ]);
  });
});

describe("parseEod", () => {
  it("handles second timestamps, sorts, skips bad rows", () => {
    const pts = parseEod({ status: 1, data: [[1762387200, 101.5, 2000, 100], [1762300800, "99.25", 1500], [null, 1], ["x", 2]] });
    expect(pts).toHaveLength(2);
    expect(pts[0].close).toBe(99.25);
    expect(pts[1].date.toISOString().slice(0, 10)).toBe("2025-11-06");
    expect(pts[1].open).toBe(100);
  });
});

describe("number and date parsing", () => {
  it.each([["1,234.5", 1234.5], ["(250,000)", -250000], ["12.3%", 12.3], ["-", null], ["", null], ["n/a", null]])("%s", (s, v) => {
    expect(parseNumber(s)).toBe(v);
  });
  it.each([["Nov 6, 2026", "2026-11-06"], ["6 Nov 2026", "2026-11-06"], ["06/11/2026", "2026-11-06"], ["2026-11-06", "2026-11-06"]])("%s", (s, iso) => {
    expect(parseDate(s)?.toISOString().slice(0, 10)).toBe(iso);
  });
});

describe("parseCompanyHtml", () => {
  const html = readFileSync(path.join(__dirname, "__fixtures__/company.html"), "utf8");
  const c = parseCompanyHtml(html, "SMTC", "https://dps.psx.com.pk");
  it("reads profile", () => {
    expect(c.profile.businessDescription).toBe("Manufacture and sale of cement.");
    expect(c.profile.auditor).toBe("Illustrative Chartered Accountants");
    expect(c.profile.keyPeople?.[0]).toEqual({ name: "A. Example", role: "CEO" });
  });
  it("reads annual and quarterly highlights and ratios", () => {
    expect(c.financials.annual["Sales"]["2025"]).toBe(61_000_000);
    expect(c.financials.annual["Profit after Taxation"]["2023"]).toBe(-250_000);
    expect(c.financials.annual["EPS"]["2023"]).toBeNull();
    expect(c.financials.quarterly["Sales"]["Q1 2026"]).toBe(15_800_000);
    expect(c.ratios["Net Profit Margin (%)"]["2025"]).toBe(12.99);
  });
  it("reads and classifies announcements with document links", () => {
    expect(c.announcements).toHaveLength(3);
    const [def, res, div] = c.announcements;
    expect(def).toMatchObject({ type: "DEFAULT", riskImpact: "HIGH", sentiment: "NEGATIVE" });
    expect(def.description).toContain("https://dps.psx.com.pk/download/document/123.pdf");
    expect(res.type).toBe("RESULTS");
    expect(div.type).toBe("DIVIDEND");
    // stable ids for de-duplication
    expect(parseCompanyHtml(html, "SMTC").announcements[0].externalId).toBe(def.externalId);
  });
  it("reads payouts", () => {
    expect(c.payouts[0].details).toContain("80%(F)");
  });
});

describe("classifyAnnouncement", () => {
  it.each([
    ["Petition for winding up filed against the company", "DEFAULT", "HIGH"],
    ["Imposition of penalty for late filing", "PENALTY", "MEDIUM"],
    ["Resignation of Chief Financial Officer", "MANAGEMENT_CHANGE", "MEDIUM"],
    ["Appointment of Chief Executive", "MANAGEMENT_CHANGE", "LOW"],
    ["Election of Directors", "BOARD_CHANGE", "LOW"],
    ["Board decided not to declare any dividend", "DIVIDEND", "LOW"],
    ["Material Information - temporary closure of plant", "MATERIAL_INFO", "MEDIUM"],
    ["Material Information", "MATERIAL_INFO", "LOW"],
  ])("%s", (title, type, impact) => {
    const c = classifyAnnouncement(title);
    expect(c.type).toBe(type);
    expect(c.riskImpact).toBe(impact);
  });
});

describe("DpsPsxClient", () => {
  it("calls the configured endpoints and parses responses", async () => {
    const calls: string[] = [];
    const fake = (async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify([{ symbol: "SMTC", name: "Summit Cement Limited" }]), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new DpsPsxClient("https://example.test", fake);
    const syms = await client.fetchSymbols();
    expect(calls).toEqual(["https://example.test/symbols"]);
    expect(syms[0].symbol).toBe("SMTC");
  });
  it("does not retry a 404 and surfaces a clear error", async () => {
    let n = 0;
    const fake = (async () => {
      n++;
      return new Response("nope", { status: 404 });
    }) as unknown as typeof fetch;
    await expect(new DpsPsxClient("https://example.test", fake).fetchCompany("ZZZZ")).rejects.toThrow("PSX returned 404");
    expect(n).toBe(1);
  });
});
