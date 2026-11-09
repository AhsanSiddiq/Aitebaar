/**
 * PSX sync from the command line.
 *
 *   npm run psx:sync -- --symbols              load / refresh the full PSX symbol list
 *   npm run psx:sync -- --company LUCK         company page + prices for one symbol
 *   npm run psx:sync -- --linked               every symbol linked to an approved borrower
 *   npm run psx:sync -- --all [--limit 50]     symbols, then every company (slow, polite)
 *   npm run psx:sync -- --probe [SYMBOL]       print raw shapes from the portal (no DB writes)
 *
 * Uses PSX_DATA_SOURCE (dps | seed). Add --source dps to override.
 */
import { PrismaClient } from "@prisma/client";
import { PSX_CONFIG } from "@/config/psx";
import { getPsxSource, DpsPsxClient } from "@/lib/integrations/psx";
import { syncCompany, syncLinkedCompanies, syncSymbols } from "@/lib/psx/sync";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const value = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};

async function main() {
  const prisma = new PrismaClient();
  const src = getPsxSource((value("source") as "dps" | "seed") ?? undefined);
  console.log(`PSX source: ${src.source}${src.source === "DPS" ? ` (${PSX_CONFIG.baseUrl})` : ""}`);
  try {
    if (flag("probe")) {
      const c = new DpsPsxClient();
      const sym = value("probe") ?? "LUCK";
      const syms = await c.fetchSymbols();
      console.log(`symbols: ${syms.length}`, syms.slice(0, 3));
      const eod = await c.fetchEod(sym);
      console.log(`eod ${sym}: ${eod.length} points`, eod.slice(-2));
      const co = await c.fetchCompany(sym);
      console.log(`company ${sym}:`, JSON.stringify({ profile: co.profile, annual: co.financials.annual, quarterlyRows: Object.keys(co.financials.quarterly), ratios: Object.keys(co.ratios), announcements: co.announcements.slice(0, 5), payouts: co.payouts.slice(0, 3) }, null, 2));
      return;
    }
    if (flag("symbols") || flag("all")) console.log("symbols:", await syncSymbols(prisma, src, "cli"));
    if (value("company")) console.log(value("company"), await syncCompany(prisma, src, value("company")!.toUpperCase(), "cli"));
    if (flag("linked")) console.log("linked:", await syncLinkedCompanies(prisma, src, "cli"));
    if (flag("all")) {
      const limit = Number(value("limit") ?? Infinity);
      const syms = await prisma.psxSymbol.findMany({ where: { active: true, isEtf: false, isDebt: false }, orderBy: { symbol: "asc" } });
      let ok = 0, failed = 0;
      for (const s of syms.slice(0, limit)) {
        try {
          await syncCompany(prisma, src, s.symbol, "cli");
          ok++;
        } catch (e) {
          failed++;
          console.warn(`  ${s.symbol}: ${e instanceof Error ? e.message : e}`);
        }
        if (ok % 25 === 0) console.log(`  ${ok} companies synced…`);
        await new Promise((r) => setTimeout(r, PSX_CONFIG.delayBetweenRequestsMs));
      }
      console.log(`companies: ${ok} ok, ${failed} failed`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
