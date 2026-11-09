import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { LINE_ITEMS } from "@/config/spreading";
import { orrGrade } from "@/config/grades";
import { computeRatios, sectorBenchmark, trend } from "@/lib/finance/ratios";
import { computeFrr } from "@/lib/finance/scorecard";
import { computeEcl, ead as computeEad } from "@/lib/finance/ecl";
import { SeedPsxAdapter, type ExchangeAnnouncement } from "@/lib/integrations/exchange";
import { ALERTS, BORROWERS, DEMO_LENDER_ID, DEMO_PASSWORD, LENDER, PERIODS, USERS, buildSpread } from "@/prisma/seed-data";

const DAY = 86_400_000;

/**
 * Wipes and reseeds the demo tenant. Used by `npm run db:seed` and by the
 * Admin "reset demo" action, so pilots can be re-run from a clean state.
 * All dates are relative to `now` so the monitoring window is always populated.
 */
export async function seedDemo(prisma: PrismaClient, now = new Date()) {
  const daysAgo = (d: number) => new Date(now.getTime() - d * DAY);
  const monthsAgo = (m: number) => new Date(now.getTime() - m * 30 * DAY);

  // Stable ids for the demo tenant and users, so signed-in sessions survive a reset.
  // Book data (borrowers cascade to everything below them), groups and alerts are wiped;
  // the audit log is kept and the reset itself is logged.
  const lender = await prisma.lender.upsert({ where: { id: DEMO_LENDER_ID }, update: LENDER, create: { id: DEMO_LENDER_ID, ...LENDER } });
  await prisma.alert.deleteMany({ where: { lenderId: lender.id } });
  await prisma.borrower.deleteMany({ where: { lenderId: lender.id } });
  await prisma.group.deleteMany({ where: { lenderId: lender.id } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = await Promise.all(
    USERS.map((u) => {
      const id = `demo-user-${u.role.toLowerCase()}`;
      const data = { ...u, passwordHash, lenderId: lender.id };
      return prisma.user.upsert({ where: { email: u.email }, update: data, create: { id, ...data } });
    }),
  );
  const rm = users.find((u) => u.role === "RM")!;
  const analyst = users.find((u) => u.role === "ANALYST")!;
  const cro = users.find((u) => u.role === "CRO")!;

  const groupIds = new Map<string, string>();
  for (const name of new Set(BORROWERS.map((b) => b.group).filter(Boolean) as string[])) {
    const g = await prisma.group.create({ data: { name, lenderId: lender.id } });
    groupIds.set(name, g.id);
  }

  // PSX announcements are ingested through the adapter seam, exactly as a licensed feed would be.
  const fixtures: ExchangeAnnouncement[] = BORROWERS.flatMap((b) =>
    (b.psx ?? []).map((e, i) => ({
      externalId: `${b.ticker}-${i}`,
      symbol: b.ticker!,
      type: e.type,
      date: daysAgo(e.daysAgo),
      title: e.title,
      description: e.description,
      sentiment: e.sentiment,
      riskImpact: e.riskImpact,
    })),
  );
  const psx = new SeedPsxAdapter(fixtures);

  const borrowerIds = new Map<string, string>();

  for (const b of BORROWERS) {
    const borrower = await prisma.borrower.create({
      data: {
        lenderId: lender.id,
        groupId: b.group ? groupIds.get(b.group) : null,
        ownerId: rm.id,
        name: b.name,
        sector: b.sector,
        listed: b.listed,
        ticker: b.ticker,
        ownership: b.ownership,
        description: b.description,
        watchList: b.watchList ?? false,
        nextReviewDate: new Date(now.getTime() + b.nextReviewInDays * DAY),
      },
    });
    borrowerIds.set(b.key, borrower.id);

    // --- Financials: 3 years, spread into the standard template, ratios stored per period.
    let priorRatios: Record<string, number | null> | null = null;
    let latestStatementId = "";
    for (let i = 0; i < PERIODS.length; i++) {
      const p = PERIODS[i];
      const spread = buildSpread(b.years[i], p.rate);
      const isLatest = i === PERIODS.length - 1;
      const notesText = isLatest ? [b.notesFiller, ...b.notes.map((n) => n.snippet)].join("\n\n") : null;
      const st = await prisma.financialStatement.create({
        data: {
          borrowerId: borrower.id,
          period: p.period,
          periodEnd: new Date(p.periodEnd),
          type: "ANNUAL_AUDITED",
          source: "SEED",
          status: isLatest ? "REVIEWED" : "APPROVED",
          auditor: b.auditor,
          notesText,
          lineItems: {
            create: LINE_ITEMS.filter((li) => spread[li.key] != null).map((li) => ({ key: li.key, value: spread[li.key]! })),
          },
        },
      });
      if (isLatest) latestStatementId = st.id;

      const ratios = computeRatios(spread);
      await prisma.ratioResult.createMany({
        data: Object.entries(ratios).map(([ratioKey, value]) => {
          const priorValue = priorRatios?.[ratioKey] ?? null;
          return {
            borrowerId: borrower.id,
            period: p.period,
            ratioKey,
            value,
            priorValue,
            benchmark: sectorBenchmark(b.sector, ratioKey),
            trend: trend(value, priorValue),
          };
        }),
      });
      priorRatios = ratios;
    }

    // --- Notes red flags (every snippet is an exact substring of notesText).
    await prisma.notesFlag.createMany({
      data: b.notes.map((n) => ({
        borrowerId: borrower.id,
        statementId: latestStatementId,
        category: n.category,
        severity: n.severity,
        sourceSnippet: n.snippet,
        explanation: n.explanation,
        status: n.status ?? "OPEN",
        reviewedBy: n.status && n.status !== "OPEN" ? analyst.name : null,
        origin: "SEED",
      })),
    });

    // --- ORR history (versioned). Latest version is current.
    for (let v = 0; v < b.ratings.length; v++) {
      const r = b.ratings[v];
      const isLatest = v === b.ratings.length - 1;
      const score = Math.round((0.6 * r.quant + 0.4 * r.qual) * 10) / 10;
      await prisma.rating.create({
        data: {
          borrowerId: borrower.id,
          version: v + 1,
          orrGrade: r.orr,
          modelGrade: r.modelGrade ?? r.orr,
          finalGrade: r.orr,
          score,
          quantScore: r.quant,
          qualScore: r.qual,
          sbpClassification: orrGrade(r.orr).sbpClass,
          rationale: r.rationale,
          overrideReason: r.overrideReason,
          status: isLatest && r.monthsAgo === 0 ? "PENDING_APPROVAL" : "APPROVED",
          preparedBy: analyst.name,
          approvedBy: isLatest && r.monthsAgo === 0 ? null : cro.name,
          effectiveDate: monthsAgo(r.monthsAgo),
        },
      });
    }
    const currentOrr = b.ratings[b.ratings.length - 1].orr;

    // --- Facilities, collateral, FRR and ECL.
    for (const f of b.facilities) {
      const facility = await prisma.facility.create({
        data: {
          borrowerId: borrower.id,
          type: f.type,
          funded: !["LETTER_OF_CREDIT", "GUARANTEE"].includes(f.type),
          sanctioned: f.sanctioned,
          outstanding: f.outstanding,
          pricing: f.pricing,
          eir: f.eir,
          sanctionDate: new Date(f.sanctionDate),
          maturityDate: new Date(f.maturityDate),
          seniority: f.seniority,
          dpd: f.dpd,
          restructured: f.restructured ?? false,
          classification: f.classification,
          classificationReason: f.classificationReason,
          purpose: f.purpose,
          covenants: f.covenants ? JSON.stringify(f.covenants) : null,
          collateral: {
            create: f.collateral.map((c) => ({ ...c, valuationDate: monthsAgo(6) })),
          },
        },
      });

      const exposureAtDefault = computeEad(f.type, f.sanctioned, f.outstanding);
      const frr = computeFrr({ ead: exposureAtDefault, seniority: f.seniority, collateral: f.collateral });
      await prisma.facilityRating.create({
        data: {
          facilityId: facility.id,
          frrGrade: frr.grade,
          securityCoverage: frr.securityCoverage,
          lgd: frr.lgd,
          rationale: [`FSV coverage ${(frr.securityCoverage * 100).toFixed(0)}% → base ${frr.baseGrade}`, ...frr.adjustments].join("; "),
          effectiveDate: monthsAgo(1),
        },
      });

      const years = Math.max(0, (new Date(f.maturityDate).getTime() - now.getTime()) / (365 * DAY));
      const tangibleFsv = f.collateral.filter((c) => !c.type.endsWith("GUARANTEE")).reduce((s, c) => s + c.fsv, 0);
      const ecl = computeEcl({
        stage: b.stage,
        pd12m: orrGrade(currentOrr).pd12m,
        lgd: frr.lgd,
        ead: exposureAtDefault,
        yearsToMaturity: years,
        eir: f.eir,
        sbpClass: f.classification,
        outstanding: f.outstanding,
        fsvBenefit: tangibleFsv,
      });
      await prisma.eclResult.create({
        data: {
          facilityId: facility.id,
          stage: ecl.stage,
          originationStage: 1,
          stageReason: b.stageReason,
          pd: ecl.pd,
          lgd: ecl.lgd,
          ead: ecl.ead,
          scenarioBreakdown: JSON.stringify(ecl.scenarios),
          ifrs9Ecl: ecl.ifrs9Ecl,
          prProvision: ecl.prProvision,
          finalEcl: ecl.finalEcl,
          asOf: now,
        },
      });
    }

    // --- Monitoring: news + PSX events (listed only, via adapter).
    await prisma.newsItem.createMany({
      data: b.news.map((n) => ({
        borrowerId: borrower.id,
        source: n.source,
        headline: n.headline,
        summary: n.summary,
        date: daysAgo(n.daysAgo),
        sentiment: n.sentiment,
        impact: n.impact,
        riskSignal: n.riskSignal,
      })),
    });
    if (b.listed && b.ticker) {
      const anns = await psx.fetchAnnouncements(b.ticker, daysAgo(365));
      await prisma.exchangeEvent.createMany({
        data: anns.map((a) => ({
          borrowerId: borrower.id,
          exchange: psx.exchange,
          type: a.type,
          date: a.date,
          title: a.title,
          description: a.description,
          sentiment: a.sentiment,
          riskImpact: a.riskImpact,
          source: psx.source,
          externalId: a.externalId,
        })),
      });
    }

    // --- Credit proposal (partially filled) + profile.
    await prisma.creditProposal.create({
      data: {
        borrowerId: borrower.id,
        version: 1,
        content: JSON.stringify(b.proposal),
        status: "DRAFT",
        createdBy: rm.name,
        approvals: {
          create: [
            { role: "RM", approver: rm.name, decision: "APPROVED", decidedAt: daysAgo(4) },
            { role: "ANALYST", decision: "PENDING" },
            { role: "CRO", decision: "PENDING" },
          ],
        },
      },
    });
    if (b.profile.length) {
      await prisma.profileScore.createMany({
        data: b.profile.map((p) => ({ borrowerId: borrower.id, section: p.section, content: p.content, score: p.score })),
      });
    }
  }

  await prisma.alert.createMany({
    data: ALERTS.map((a) => ({
      lenderId: lender.id,
      borrowerId: borrowerIds.get(a.borrower)!,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      status: a.status ?? "OPEN",
      createdAt: daysAgo(a.daysAgo),
    })),
  });

  await prisma.auditLog.create({
    data: { lenderId: lender.id, actor: "system", action: "RESET_DEMO", entity: "Lender", entityId: lender.id, after: JSON.stringify({ borrowers: BORROWERS.length }) },
  });

  return { lenderId: lender.id, borrowers: BORROWERS.length, users: users.length };
}
