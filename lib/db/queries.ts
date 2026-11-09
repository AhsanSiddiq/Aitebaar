import { prisma } from "@/lib/db/prisma";
import { FRR_GRADES, type BorrowerStatus, type FrrGrade, type Ifrs9Stage, type SbpClass, type Sector } from "@/lib/domain";
import { worstClass } from "@/lib/finance/classification";
import { borrowerStatus, compositeRiskScore, type Signal } from "@/lib/finance/monitoring";
import { concentration, type ConcentrationRow } from "@/lib/finance/concentration";
import { orrGrade } from "@/config/grades";

/**
 * Tenant-scoped read models. Every function takes `lenderId` and filters by it:
 * a lender only ever sees its own book.
 */

export interface PortfolioRow {
  id: string;
  name: string;
  sector: Sector;
  listed: boolean;
  ticker: string | null;
  groupName: string | null;
  exposure: number;
  sanctioned: number;
  orr: number | null;
  orrPrev: number | null;
  frr: FrrGrade | null;
  stage: Ifrs9Stage;
  classification: SbpClass;
  restructured: boolean;
  compositeScore: number;
  status: BorrowerStatus;
  statusReasons: string[];
  ecl: number;
  openAlerts: number;
  nextReviewDate: Date | null;
}

const borrowerInclude = {
  group: true,
  facilities: { include: { ratings: { orderBy: { effectiveDate: "desc" as const }, take: 1 }, eclResults: { orderBy: { asOf: "desc" as const }, take: 1 } } },
  ratings: { orderBy: { version: "desc" as const }, take: 2 },
  newsItems: true,
  exchangeEvents: true,
  alerts: { where: { status: "OPEN" } },
};

type BorrowerWithAll = Awaited<ReturnType<typeof loadBorrowers>>[number];

function loadBorrowers(lenderId: string, where: { id?: string } = {}) {
  return prisma.borrower.findMany({ where: { lenderId, ...where }, include: borrowerInclude, orderBy: { name: "asc" } });
}

export function signalsFor(b: Pick<BorrowerWithAll, "newsItems" | "exchangeEvents">): Signal[] {
  return [
    ...b.newsItems.map((n) => ({ date: n.date, sentiment: n.sentiment as Signal["sentiment"], impact: n.impact as Signal["impact"] })),
    ...b.exchangeEvents.map((e) => ({ date: e.date, sentiment: e.sentiment as Signal["sentiment"], impact: e.riskImpact as Signal["impact"] })),
  ];
}

function toRow(b: BorrowerWithAll, now: Date): PortfolioRow {
  const exposure = b.facilities.reduce((s, f) => s + f.outstanding, 0);
  const sanctioned = b.facilities.reduce((s, f) => s + f.sanctioned, 0);
  const current = b.ratings[0];
  const orr = current?.finalGrade ?? null;
  const stage = Math.max(1, ...b.facilities.map((f) => f.eclResults[0]?.stage ?? 1)) as Ifrs9Stage;
  // Borrower-level classification: worst facility band, and never better than the ORR implies.
  const classification = worstClass(
    ...b.facilities.map((f) => f.classification as SbpClass),
    orr ? orrGrade(orr).sbpClass : null,
  );
  // Borrower-level FRR summary: exposure-weighted average of facility FRR grades (rounded).
  // FRR is per facility by design (§4.2); this is only a portfolio-table summary.
  const rated = b.facilities.filter((f) => f.ratings[0]);
  const ratedExp = rated.reduce((s, f) => s + f.outstanding, 0);
  const frr: FrrGrade | null =
    rated.length && ratedExp > 0
      ? FRR_GRADES[Math.round(rated.reduce((s, f) => s + FRR_GRADES.indexOf(f.ratings[0].frrGrade as FrrGrade) * f.outstanding, 0) / ratedExp)]
      : null;
  const { score } = compositeRiskScore(signalsFor(b), now);
  const { status, reasons } = borrowerStatus({ orrGrade: orr, sbpClass: classification, stage, compositeScore: score });
  return {
    id: b.id,
    name: b.name,
    sector: b.sector as Sector,
    listed: b.listed,
    ticker: b.ticker,
    groupName: b.group?.name ?? null,
    exposure,
    sanctioned,
    orr,
    orrPrev: b.ratings[1]?.finalGrade ?? null,
    frr,
    stage,
    classification,
    restructured: b.facilities.some((f) => f.restructured),
    compositeScore: score,
    status,
    statusReasons: reasons,
    ecl: b.facilities.reduce((s, f) => s + (f.eclResults[0]?.finalEcl ?? 0), 0),
    openAlerts: b.alerts.length,
    nextReviewDate: b.nextReviewDate,
  };
}

export async function getPortfolio(lenderId: string, now = new Date()) {
  const [lender, borrowers, alerts] = await Promise.all([
    prisma.lender.findUniqueOrThrow({ where: { id: lenderId } }),
    loadBorrowers(lenderId),
    prisma.alert.findMany({
      where: { lenderId, status: { not: "RESOLVED" } },
      include: { borrower: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows = borrowers.map((b) => toRow(b, now));
  const totalExposure = rows.reduce((s, r) => s + r.exposure, 0);
  const rated = rows.filter((r) => r.orr != null);
  const ratedExposure = rated.reduce((s, r) => s + r.exposure, 0);
  const weightedOrr = ratedExposure > 0 ? rated.reduce((s, r) => s + r.orr! * r.exposure, 0) / ratedExposure : null;
  const totalEcl = rows.reduce((s, r) => s + r.ecl, 0);
  const byStage = ([1, 2, 3] as const).map((stage) => ({
    stage,
    exposure: rows.filter((r) => r.stage === stage).reduce((s, r) => s + r.exposure, 0),
    count: rows.filter((r) => r.stage === stage).length,
  }));
  const byStatus = (["CLEAR", "WATCH", "ALERT"] as const).map((status) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
    exposure: rows.filter((r) => r.status === status).reduce((s, r) => s + r.exposure, 0),
  }));

  // R-1 concentration: every borrower and every group, worst utilisation first.
  const groups = new Map<string, { name: string; exposure: number; members: string[] }>();
  for (const b of borrowers) {
    if (!b.group) continue;
    const g = groups.get(b.group.id) ?? { name: b.group.name, exposure: 0, members: [] };
    g.exposure += rows.find((r) => r.id === b.id)!.exposure;
    g.members.push(b.name);
    groups.set(b.group.id, g);
  }
  const concentrationRows: (ConcentrationRow & { members?: string[] })[] = [
    ...rows.map((r) => concentration("BORROWER", r.id, r.name, r.exposure, lender.equity)),
    ...[...groups.entries()].map(([id, g]) => ({ ...concentration("GROUP", id, g.name, g.exposure, lender.equity), members: g.members })),
  ].sort((a, b) => b.utilisation - a.utilisation);

  return {
    lender,
    rows,
    alerts,
    kpis: {
      totalExposure,
      borrowerCount: rows.length,
      weightedOrr,
      openAlerts: alerts.filter((a) => a.status === "OPEN").length,
      highAlerts: alerts.filter((a) => a.status === "OPEN" && a.severity === "HIGH").length,
      totalEcl,
      eclCoverage: totalExposure > 0 ? totalEcl / totalExposure : 0,
      byStage,
      byStatus,
    },
    concentration: concentrationRows,
  };
}

export async function getBorrower(lenderId: string, id: string, now = new Date()) {
  const [b] = await loadBorrowers(lenderId, { id });
  if (!b) return null;
  const full = await prisma.borrower.findFirstOrThrow({
    where: { id, lenderId },
    include: {
      owner: { select: { name: true } },
      facilities: {
        include: { collateral: true, ratings: { orderBy: { effectiveDate: "desc" }, take: 1 }, eclResults: { orderBy: { asOf: "desc" }, take: 1 } },
        orderBy: { outstanding: "desc" },
      },
      ratings: { orderBy: { version: "desc" } },
      alerts: { orderBy: { createdAt: "desc" } },
      notesFlags: true,
      newsItems: { orderBy: { date: "desc" } },
      exchangeEvents: { orderBy: { date: "desc" } },
      listingLinks: { orderBy: { requestedAt: "desc" }, include: { psx: true } },
      psxSymbol: true,
    },
  });
  const lender = await prisma.lender.findUniqueOrThrow({ where: { id: lenderId } });
  const row = toRow(b, now);
  return {
    row,
    borrower: full,
    composite: compositeRiskScore(signalsFor(b), now),
    r1: concentration("BORROWER", b.id, b.name, row.exposure, lender.equity),
    psx: full.ticker && full.listed ? await getPsxView(full.ticker) : null,
  };
}

export async function getAlerts(lenderId: string) {
  return prisma.alert.findMany({
    where: { lenderId },
    include: { borrower: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "desc" }],
  });
}

/** Market view for a listed borrower: latest company snapshot + recent closes. */
export async function getPsxView(symbol: string) {
  const [snapshot, prices, lastRun] = await Promise.all([
    prisma.psxCompanySnapshot.findFirst({ where: { symbol }, orderBy: { fetchedAt: "desc" } }),
    prisma.psxPrice.findMany({ where: { symbol }, orderBy: { date: "desc" }, take: 30 }),
    prisma.psxSyncRun.findFirst({ where: { symbol, kind: "COMPANY" }, orderBy: { startedAt: "desc" } }),
  ]);
  const data = snapshot ? (JSON.parse(snapshot.data) as import("@/lib/integrations/psx/types").PsxCompanyData) : null;
  const last = prices[0];
  const monthAgo = prices[prices.length - 1];
  return {
    fetchedAt: snapshot?.fetchedAt ?? null,
    source: snapshot?.source ?? null,
    lastRun,
    profile: data?.profile ?? null,
    annual: data?.financials.annual ?? {},
    lastClose: last?.close ?? null,
    lastDate: last?.date ?? null,
    change30d: last && monthAgo && monthAgo.close ? last.close / monthAgo.close - 1 : null,
    closes: prices.map((p) => p.close).reverse(),
  };
}
