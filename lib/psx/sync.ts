import type { PrismaClient } from "@prisma/client";
import { PSX_CONFIG } from "@/config/psx";
import { LINE_ITEMS } from "@/config/spreading";
import { computeRatios, sectorBenchmark, trend } from "@/lib/finance/ratios";
import type { Sector } from "@/lib/domain";
import type { PsxMarketDataSource } from "@/lib/integrations/psx/types";
import { normalizeName } from "./fuzzy";
import { highlightsToSpreads } from "./highlights";
import { invalidateSymbolCache } from "./search";

/**
 * PSX ingestion. Every run is logged in PsxSyncRun. Market data is shared
 * reference data; borrower-level effects (events, alerts, PSX-sourced
 * financials) apply only to borrowers with an APPROVED listing link.
 */

async function logged<T extends Record<string, unknown>>(
  prisma: PrismaClient,
  kind: string,
  symbol: string | null,
  actor: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const run = await prisma.psxSyncRun.create({ data: { kind, symbol, status: "RUNNING", actor } });
  try {
    const counts = await fn();
    await prisma.psxSyncRun.update({ where: { id: run.id }, data: { status: "OK", counts: JSON.stringify(counts), finishedAt: new Date() } });
    return counts;
  } catch (e) {
    await prisma.psxSyncRun.update({ where: { id: run.id }, data: { status: "FAILED", message: e instanceof Error ? e.message : String(e), finishedAt: new Date() } });
    throw e;
  }
}

/** Load the full PSX symbol list into the DB (upsert). Live symbols no longer listed are marked inactive. */
export async function syncSymbols(prisma: PrismaClient, src: PsxMarketDataSource, actor?: string) {
  return logged(prisma, "SYMBOLS", null, actor, async () => {
    const rows = await src.fetchSymbols();
    let created = 0, updated = 0;
    const now = new Date();
    for (const r of rows) {
      const existing = await prisma.psxSymbol.findUnique({ where: { symbol: r.symbol } });
      // Never let the offline demo list overwrite a real symbol that a live sync loaded.
      if (existing && existing.source === "DPS" && src.source !== "DPS") continue;
      const data = { name: r.name, normalizedName: normalizeName(r.name), sectorName: r.sectorName, isEtf: r.isEtf, isDebt: r.isDebt, source: src.source, active: true, syncedAt: now };
      if (existing) {
        await prisma.psxSymbol.update({ where: { symbol: r.symbol }, data });
        updated++;
      } else {
        await prisma.psxSymbol.create({ data: { symbol: r.symbol, ...data } });
        created++;
      }
    }
    let deactivated = 0;
    if (src.source === "DPS" && rows.length > 50) {
      const res = await prisma.psxSymbol.updateMany({ where: { source: "DPS", symbol: { notIn: rows.map((r) => r.symbol) } }, data: { active: false } });
      deactivated = res.count;
    }
    invalidateSymbolCache();
    return { fetched: rows.length, created, updated, deactivated };
  });
}

/**
 * Company page + EOD prices for one symbol, then apply to linked borrowers:
 * - announcements → ExchangeEvent (de-duplicated by externalId), HIGH impact → alert
 * - annual highlights → PSX-sourced FinancialStatement for periods we don't already hold
 */
export async function syncCompany(prisma: PrismaClient, src: PsxMarketDataSource, symbol: string, actor?: string, now = new Date()) {
  return logged(prisma, "COMPANY", symbol, actor, async () => {
    const sym = await prisma.psxSymbol.findUnique({ where: { symbol } });
    if (!sym) throw new Error(`Symbol ${symbol} is not in the PSX symbol table; sync symbols first.`);

    const company = await src.fetchCompany(symbol);
    let prices: Awaited<ReturnType<PsxMarketDataSource["fetchEod"]>> = [];
    try {
      prices = await src.fetchEod(symbol);
    } catch {
      // Prices are optional for credit monitoring; keep going.
    }
    await prisma.psxCompanySnapshot.create({ data: { symbol, data: JSON.stringify(company), source: src.source } });
    for (const p of prices.slice(-400)) {
      await prisma.psxPrice.upsert({
        where: { symbol_date: { symbol, date: p.date } },
        update: { close: p.close, volume: p.volume, open: p.open },
        create: { symbol, date: p.date, close: p.close, volume: p.volume, open: p.open },
      });
    }

    const borrowers = await prisma.borrower.findMany({ where: { ticker: symbol, listed: true } });
    const since = new Date(now.getTime() - PSX_CONFIG.announcementLookbackDays * 86_400_000);
    let events = 0, alerts = 0, statements = 0;

    for (const b of borrowers) {
      for (const a of company.announcements) {
        if (a.date < since) continue;
        const dup = await prisma.exchangeEvent.findFirst({ where: { borrowerId: b.id, externalId: a.externalId } });
        if (dup) continue;
        await prisma.exchangeEvent.create({
          data: { borrowerId: b.id, exchange: "PSX", type: a.type, date: a.date, title: a.title, description: a.description, sentiment: a.sentiment, riskImpact: a.riskImpact, source: src.source, externalId: a.externalId },
        });
        events++;
        if (a.riskImpact === "HIGH") {
          await prisma.alert.create({
            data: { lenderId: b.lenderId, borrowerId: b.id, type: "EXCHANGE_EVENT", severity: "HIGH", title: `PSX: ${a.title}`.slice(0, 140), message: `New high-impact PSX announcement (${a.type.toLowerCase().replace("_", " ")}). Review and action.` },
          });
          alerts++;
        }
      }

      if (b.financialsSource === "PSX") {
        const spreads = highlightsToSpreads(company.financials.annual);
        const periods = Object.keys(spreads).sort();
        for (const period of periods) {
          const exists = await prisma.financialStatement.findFirst({ where: { borrowerId: b.id, period } });
          if (exists) continue;
          const year = Number(period.slice(2));
          await prisma.financialStatement.create({
            data: {
              borrowerId: b.id,
              period,
              periodEnd: new Date(Date.UTC(year, 5, 30)),
              type: "ANNUAL_AUDITED",
              source: "FEED",
              // Headline figures only; full statements need extraction from the results PDF (step 3).
              status: "DRAFT",
              auditor: company.profile.auditor ?? null,
              lineItems: { create: Object.entries(spreads[period]).filter(([k]) => LINE_ITEMS.some((li) => li.key === k)).map(([key, value]) => ({ key, value })) },
            },
          });
          statements++;
        }
        if (statements) await recomputeRatios(prisma, b.id, b.sector as Sector);
      }
      await prisma.auditLog.create({
        data: { lenderId: b.lenderId, actor: actor ?? "system", action: "PSX_SYNC", entity: "Borrower", entityId: b.id, after: JSON.stringify({ symbol, events, statements }) },
      });
    }
    return { announcements: company.announcements.length, prices: prices.length, borrowers: borrowers.length, events, alerts, statements };
  });
}

/** Recompute stored ratios for every period of a borrower from its spreads. */
export async function recomputeRatios(prisma: PrismaClient, borrowerId: string, sector: Sector) {
  const sts = await prisma.financialStatement.findMany({ where: { borrowerId }, include: { lineItems: true }, orderBy: { periodEnd: "asc" } });
  let prior: Record<string, number | null> | null = null;
  for (const st of sts) {
    const spread = Object.fromEntries(st.lineItems.map((li) => [li.key, li.value]));
    const ratios = computeRatios(spread);
    for (const [ratioKey, value] of Object.entries(ratios)) {
      const priorValue = prior?.[ratioKey] ?? null;
      const data = { value, priorValue, benchmark: sectorBenchmark(sector, ratioKey), trend: trend(value, priorValue), computedAt: new Date() };
      await prisma.ratioResult.upsert({
        where: { borrowerId_period_ratioKey: { borrowerId, period: st.period, ratioKey } },
        update: data,
        create: { borrowerId, period: st.period, ratioKey, ...data },
      });
    }
    prior = ratios;
  }
}

/** Sync every symbol that has at least one approved, listed borrower. */
export async function syncLinkedCompanies(prisma: PrismaClient, src: PsxMarketDataSource, actor?: string) {
  const rows = await prisma.borrower.findMany({ where: { listed: true, ticker: { not: null } }, select: { ticker: true }, distinct: ["ticker"] });
  const results: Record<string, unknown> = {};
  for (const { ticker } of rows) {
    try {
      results[ticker!] = await syncCompany(prisma, src, ticker!, actor);
    } catch (e) {
      results[ticker!] = { error: e instanceof Error ? e.message : String(e) };
    }
    await new Promise((r) => setTimeout(r, PSX_CONFIG.delayBetweenRequestsMs));
  }
  return results;
}
