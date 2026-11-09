import * as cheerio from "cheerio";
import { z } from "zod";
import type { ExchangeAnnouncement } from "@/lib/integrations/exchange";
import { classifyAnnouncement } from "./classify";
import type { HighlightTable, PsxCompanyData, PsxPricePoint, PsxSymbolRecord } from "./types";

/**
 * Parsers for PSX data-portal responses. Written defensively: the portal is a
 * website, not a versioned API, so unknown fields are ignored and malformed
 * rows are skipped rather than failing the whole sync.
 */

const symbolRow = z
  .object({
    symbol: z.string().min(1),
    name: z.string().optional().nullable(),
    sectorName: z.string().optional().nullable(),
    isETF: z.boolean().optional().nullable(),
    isDebt: z.boolean().optional().nullable(),
  })
  .passthrough();

export function parseSymbols(json: unknown): PsxSymbolRecord[] {
  const rows = z.array(z.unknown()).parse(json);
  const out: PsxSymbolRecord[] = [];
  for (const r of rows) {
    const p = symbolRow.safeParse(r);
    if (!p.success) continue;
    out.push({
      symbol: p.data.symbol.trim().toUpperCase(),
      name: (p.data.name ?? p.data.symbol).trim(),
      sectorName: p.data.sectorName?.trim() || null,
      isEtf: !!p.data.isETF,
      isDebt: !!p.data.isDebt,
    });
  }
  return out;
}

const eodResponse = z.object({ status: z.union([z.number(), z.string()]).optional(), data: z.array(z.array(z.union([z.number(), z.string(), z.null()]))) }).passthrough();

export function parseEod(json: unknown): PsxPricePoint[] {
  const { data } = eodResponse.parse(json);
  const out: PsxPricePoint[] = [];
  for (const row of data) {
    const [t, close, volume, open] = row.map((v) => (v == null ? null : Number(v)));
    if (t == null || close == null || !Number.isFinite(t) || !Number.isFinite(close)) continue;
    const ms = t < 1e12 ? t * 1000 : t; // seconds or milliseconds
    out.push({ date: new Date(ms), close, volume: volume ?? null, open: open ?? null });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** "(1,234.5)" → -1234.5 · "12.3%" → 12.3 · "-" / "" → null. */
export function parseNumber(text: string): number | null {
  const t = text.replace(/[,\s%]/g, "").replace(/^Rs\.?/i, "");
  if (!t || t === "-" || t === "—" || /^n\/?a$/i.test(t)) return null;
  const neg = /^\(.*\)$/.test(t);
  const n = Number(t.replace(/[()]/g, ""));
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Accepts "Nov 6, 2026", "6 Nov 2026", "06/11/2026" (dd/mm/yyyy, PSX convention), "2026-11-06". */
export function parseDate(text: string): Date | null {
  const s = text.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()] != null) return new Date(Date.UTC(+m[3], MONTHS[m[1].toLowerCase()], +m[2]));
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()] != null) return new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1]));
  return null;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

type TableKind = "ANNUAL" | "QUARTERLY" | "RATIOS" | "ANNOUNCEMENTS" | "PAYOUTS" | "UNKNOWN";

function contextOf($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): string {
  // Ids, classes and data-names of ancestors + the nearest preceding heading.
  const parts: string[] = [];
  $(el)
    .parents()
    .slice(0, 6)
    .each((_, p) => {
      const $p = $(p);
      parts.push($p.attr("id") ?? "", $p.attr("class") ?? "", $p.attr("data-name") ?? "", $p.attr("data-tab") ?? "");
    });
  const heading = $(el).prevAll("h1,h2,h3,h4,h5,.section__title,.title").first().text() || $(el).parent().prevAll("h1,h2,h3,h4,h5,.section__title,.title").first().text();
  parts.push(heading);
  return parts.join(" ").toLowerCase();
}

function classifyTable(ctx: string, headers: string[]): TableKind {
  const h = headers.join(" ").toLowerCase();
  if (/announcement/.test(ctx) || (/date/.test(h) && /title|subject|announcement/.test(h))) return "ANNOUNCEMENTS";
  if (/payout/.test(ctx) || /book closure|details/.test(h)) return "PAYOUTS";
  if (/ratio/.test(ctx)) return "RATIOS";
  if (/quarter/.test(ctx) || /\bq[1-4]\b/.test(h)) return "QUARTERLY";
  if (/annual|financial/.test(ctx) || /\b(19|20)\d{2}\b/.test(h)) return "ANNUAL";
  return "UNKNOWN";
}

function readHighlightTable($: cheerio.CheerioAPI, table: Parameters<cheerio.CheerioAPI>[0], headers: string[]): HighlightTable {
  const periods = headers.slice(1);
  const out: HighlightTable = {};
  $(table)
    .find("tbody tr, tr")
    .each((_, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < 2) return;
      const label = clean($(cells[0]).text());
      if (!label) return;
      const row: Record<string, number | null> = {};
      cells.slice(1).each((i, td) => {
        if (periods[i]) row[periods[i]] = parseNumber(clean($(td).text()));
      });
      out[label] = row;
    });
  return out;
}

export function parseCompanyHtml(html: string, symbol: string, baseUrl = ""): PsxCompanyData {
  const $ = cheerio.load(html);
  const result: PsxCompanyData = { symbol, profile: {}, financials: { annual: {}, quarterly: {} }, ratios: {}, announcements: [], payouts: [] };

  // Profile: label/value pairs, located by their visible headings.
  const PROFILE_LABELS: [RegExp, keyof PsxCompanyData["profile"]][] = [
    [/^business description$/i, "businessDescription"],
    [/^address$/i, "address"],
    [/^website$/i, "website"],
    [/^auditor$/i, "auditor"],
    [/^fiscal year end$/i, "fiscalYearEnd"],
  ];
  $("div, span, h3, h4, dt, th").each((_, el) => {
    const own = clean($(el).clone().children().remove().end().text());
    for (const [re, key] of PROFILE_LABELS) {
      if (!re.test(own) || result.profile[key]) continue;
      const value = clean($(el).next().text() || $(el).parent().find("p").first().text());
      if (value && key !== "keyPeople") (result.profile as Record<string, string>)[key] = value;
    }
    if (/^key people$/i.test(own) && !result.profile.keyPeople) {
      const people: { name: string; role: string }[] = [];
      $(el)
        .parent()
        .find("tr")
        .each((__, tr) => {
          const tds = $(tr).find("td");
          if (tds.length >= 2) people.push({ name: clean($(tds[0]).text()), role: clean($(tds[1]).text()) });
        });
      if (people.length) result.profile.keyPeople = people;
    }
  });

  $("table").each((_, table) => {
    const headerCells = $(table).find("thead th").length ? $(table).find("thead th") : $(table).find("tr").first().find("th,td");
    const headers = headerCells.map((__, th) => clean($(th).text())).get();
    const kind = classifyTable(contextOf($, table), headers);

    if (kind === "ANNUAL" || kind === "QUARTERLY" || kind === "RATIOS") {
      const t = readHighlightTable($, table, headers);
      const target = kind === "RATIOS" ? result.ratios : kind === "ANNUAL" ? result.financials.annual : result.financials.quarterly;
      Object.assign(target, t);
    } else if (kind === "ANNOUNCEMENTS") {
      const dateIdx = Math.max(0, headers.findIndex((h) => /date/i.test(h)));
      const titleIdx = headers.findIndex((h) => /title|subject|announcement/i.test(h));
      $(table)
        .find("tbody tr, tr")
        .each((i, tr) => {
          const tds = $(tr).find("td");
          if (tds.length < 2) return;
          const date = parseDate(clean($(tds[dateIdx]).text()));
          const title = clean($(tds[titleIdx >= 0 ? titleIdx : 1]).text());
          if (!date || !title) return;
          const href = $(tr).find("a[href]").last().attr("href");
          const url = href ? (href.startsWith("http") ? href : `${baseUrl}${href}`) : undefined;
          const c = classifyAnnouncement(title);
          const ann: ExchangeAnnouncement & { url?: string } = {
            externalId: `${symbol}-${date.toISOString().slice(0, 10)}-${hash(title)}`,
            symbol,
            type: c.type,
            date,
            title,
            description: url ? `${title} (document: ${url})` : title,
            sentiment: c.sentiment,
            riskImpact: c.riskImpact,
            url,
          };
          result.announcements.push(ann);
        });
    } else if (kind === "PAYOUTS") {
      $(table)
        .find("tbody tr, tr")
        .each((__, tr) => {
          const tds = $(tr).find("td");
          if (tds.length < 2) return;
          result.payouts.push({ date: clean($(tds[0]).text()), details: clean(tds.slice(1).text()) });
        });
    }
  });
  return result;
}

/** Small stable hash for de-duplicating announcements across syncs. */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
