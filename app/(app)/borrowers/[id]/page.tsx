import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getBorrower } from "@/lib/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { AlertItem } from "@/components/alert-item";
import { ClassBadge, OrrChip, SeverityBadge, StageBadge, StatusBadge } from "@/components/risk-badges";
import { FACILITY_TYPE_LABELS, SECTOR_LABELS, type FacilityType, type SbpClass, type Severity } from "@/lib/domain";
import { orrGrade, FRR_DESCRIPTIONS } from "@/config/grades";
import { dateShort, pct, pkrMn } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PsxListingCard } from "@/components/psx-listing-card";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/** Borrower detail tabs (§9). Only Overview is built in steps 1–2; the rest arrive in later build steps. */
const TABS = [
  { key: "overview", label: "Overview", step: null },
  { key: "financials", label: "Financials & Ratios", step: 3 },
  { key: "notes", label: "Notes Intelligence", step: 4 },
  { key: "rating", label: "Rating", step: 5 },
  { key: "monitoring", label: "Monitoring", step: 6 },
  { key: "proposal", label: "Credit Proposal", step: 7 },
];

export default async function BorrowerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getBorrower(user.lenderId, id);
  if (!data) notFound();
  const { row, borrower: b, composite, r1, psx } = data;
  const pendingLink = b.listingLinks.find((l) => l.status === "PENDING");
  const rating = b.ratings[0];
  const signals = [
    ...b.newsItems.map((n) => ({ kind: "News", id: n.id, date: n.date, title: n.headline, source: n.source, sentiment: n.sentiment, impact: n.impact as Severity })),
    ...b.exchangeEvents.map((e) => ({ kind: `PSX · ${e.type.replace("_", " ").toLowerCase()}`, id: e.id, date: e.date, title: e.title, source: e.source === "SEED" ? "PSX (demo)" : "PSX", sentiment: e.sentiment, impact: e.riskImpact as Severity })),
  ].sort((x, y) => y.date.getTime() - x.date.getTime());
  const openFlags = b.notesFlags.filter((f) => f.status !== "DISMISSED");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-50 hover:text-ink">
          <ChevronLeft className="size-4" /> Portfolio
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold">{b.name}</h1>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-50">
              <span>{SECTOR_LABELS[row.sector]}</span>
              <span>·</span>
              <span>{b.listed ? `Listed on PSX: ${b.ticker}` : "Unlisted"}</span>
              {row.groupName && <><span>·</span><span>{row.groupName}</span></>}
              <span>·</span>
              <span>RM: {b.owner?.name ?? "Unassigned"}</span>
              {b.nextReviewDate && <><span>·</span><span>Next review {dateShort(b.nextReviewDate)}</span></>}
            </div>
            {row.statusReasons.length > 0 && <p className="mt-2 text-sm text-ink-70">Why {row.status.toLowerCase()}: {row.statusReasons.join(" · ")}</p>}
          </div>
        </div>
      </div>

      <nav className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Borrower sections">
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <li key={t.key}>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm",
                  t.step == null ? "border-emerald font-medium text-ink" : "border-transparent text-ink-50",
                )}
                title={t.step ? `Arrives in build step ${t.step}` : undefined}
              >
                {t.label}
                {t.step && <span className="rounded bg-paper px-1 text-[10px] ring-1 ring-inset ring-line">soon</span>}
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Exposure" value={`${pkrMn(row.exposure)}m`} sub={`of PKR ${pkrMn(row.sanctioned)}m sanctioned`} />
        <KpiCard label="ORR" value={<OrrChip grade={row.orr} prev={row.orrPrev} />} sub={row.orr ? orrGrade(row.orr).label : undefined} />
        <KpiCard label="FRR (exposure-wtd)" value={row.frr ?? "n/a"} sub={row.frr ? FRR_DESCRIPTIONS[row.frr].split(";")[0] : undefined} />
        <KpiCard label="Classification" value={<ClassBadge cls={row.classification} />} sub={row.restructured ? "R-9 restructured facility" : "SBP R-8"} />
        <KpiCard label="IFRS 9" value={<StageBadge stage={row.stage} />} sub={`ECL PKR ${pkrMn(row.ecl, 1)}m`} />
        <KpiCard
          label="Composite risk"
          value={composite.score.toFixed(1)}
          accent={composite.score >= 7 ? "alert" : composite.score >= 4 ? "watch" : undefined}
          sub={`${composite.contributions.length} signals · 90 days`}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Facilities</CardTitle>
              <span className="num text-xs text-ink-50">R-1: {pct(r1.utilisation, 0)} of single-borrower limit</span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs text-ink-50">
                  <tr className="border-b border-line">
                    <th className="py-2.5 pl-5 pr-3 font-medium">Facility</th>
                    <th className="px-3 py-2.5 text-right font-medium">Sanctioned</th>
                    <th className="px-3 py-2.5 text-right font-medium">Outstanding</th>
                    <th className="px-3 py-2.5 font-medium">Pricing</th>
                    <th className="px-3 py-2.5 text-right font-medium">DPD</th>
                    <th className="px-3 py-2.5 font-medium">FRR</th>
                    <th className="px-3 py-2.5 font-medium">Class</th>
                    <th className="py-2.5 pl-3 pr-5 text-right font-medium">ECL</th>
                  </tr>
                </thead>
                <tbody>
                  {b.facilities.map((f) => {
                    const fr = f.ratings[0];
                    const ecl = f.eclResults[0];
                    const covenants: { text: string; status: string }[] = f.covenants ? JSON.parse(f.covenants) : [];
                    return (
                      <tr key={f.id} className="border-b border-line/70 align-top last:border-0">
                        <td className="py-3 pl-5 pr-3">
                          <div className="font-medium">{FACILITY_TYPE_LABELS[f.type as FacilityType]}</div>
                          <div className="text-xs text-ink-50">{f.purpose} · matures {dateShort(f.maturityDate)}</div>
                          <div className="mt-1 text-xs text-ink-50">
                            Security: {f.collateral.map((c) => c.description).join("; ") || "none"}
                          </div>
                          {covenants.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {covenants.map((c) => (
                                <Badge key={c.text} tone={c.status === "BREACHED" ? "alert" : c.status === "WATCH" ? "watch" : "neutral"} className="text-[10px]">
                                  {c.text} · {c.status.toLowerCase()}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {f.restructured && <Badge tone="gold" className="mt-1.5 text-[10px]">R-9 restructured</Badge>}
                        </td>
                        <td className="num px-3 py-3 text-right">{pkrMn(f.sanctioned)}</td>
                        <td className="num px-3 py-3 text-right font-medium">{pkrMn(f.outstanding)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{f.pricing}</td>
                        <td className={cn("num px-3 py-3 text-right", f.dpd >= 60 && "font-semibold text-risk-alert")}>{f.dpd}</td>
                        <td className="px-3 py-3">
                          <span className="num font-medium">{fr?.frrGrade ?? "n/a"}</span>
                          {fr && <div className="num text-xs text-ink-50">cover {pct(fr.securityCoverage, 0)}</div>}
                        </td>
                        <td className="px-3 py-3"><ClassBadge cls={f.classification as SbpClass} /></td>
                        <td className="num whitespace-nowrap py-3 pl-3 pr-5 text-right">
                          {ecl ? pkrMn(ecl.finalEcl, 1) : "n/a"}
                          {ecl && <div className="text-xs text-ink-50">Stage {ecl.stage}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signals (news & PSX)</CardTitle>
              <span className="text-xs text-ink-50">Feeds the composite risk score</span>
            </CardHeader>
            <CardContent className="divide-y divide-line/70 py-0">
              {signals.map((s) => (
                <div key={s.id} className="flex gap-3 py-3">
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", {
                      "bg-risk-alert": s.sentiment === "NEGATIVE",
                      "bg-risk-clear": s.sentiment === "POSITIVE",
                      "bg-ink-50": s.sentiment === "NEUTRAL",
                    })}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="mt-0.5 text-xs text-ink-50">
                      {dateShort(s.date)} · {s.source} · <span className="capitalize">{s.kind}</span>
                    </div>
                  </div>
                  <SeverityBadge severity={s.impact} />
                </div>
              ))}
              {signals.length === 0 && <p className="py-4 text-sm text-ink-50">No signals in the window.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-2 2xl:grid-cols-1">
          <PsxListingCard
            borrowerId={b.id}
            borrowerName={b.name}
            listed={b.listed}
            symbol={b.psxSymbol}
            financialsSource={b.financialsSource}
            pending={pendingLink ? { symbol: pendingLink.symbol, name: pendingLink.psx.name, score: pendingLink.matchScore, requestedBy: pendingLink.requestedBy, requestedAt: pendingLink.requestedAt } : null}
            view={psx}
            canPropose={can(user.role, "listing.propose")}
          />
          <Card>
            <CardHeader><CardTitle>Borrower</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-ink-70">{b.description}</p>
              <div><span className="text-ink-50">Ownership: </span>{b.ownership}</div>
              {rating && (
                <div className="rounded-lg bg-paper px-3 py-2.5">
                  <div className="text-xs font-medium uppercase tracking-wide text-ink-50">Current ORR rationale · v{rating.version}</div>
                  <p className="mt-1">{rating.rationale}</p>
                  {rating.overrideReason && <p className="mt-1 text-xs text-risk-watch-ink">Override (model {rating.modelGrade} → {rating.finalGrade}): {rating.overrideReason}</p>}
                  <p className="mt-1 text-xs text-ink-50">
                    {rating.status === "APPROVED" ? `Approved by ${rating.approvedBy}` : "Pending approval"} · effective {dateShort(rating.effectiveDate)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes red flags</CardTitle>
              <span className="num text-xs text-ink-50">{openFlags.length}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {openFlags.map((f) => (
                <div key={f.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={f.severity as Severity} />
                    <span className="text-xs font-medium capitalize text-ink-70">{f.category.replaceAll("_", " ").toLowerCase()}</span>
                  </div>
                  <p className="mt-1 text-ink-70">{f.explanation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Alert history</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {b.alerts.map((a) => (
                <AlertItem key={a.id} alert={{ ...a, borrower: null }} />
              ))}
              {b.alerts.length === 0 && <p className="text-sm text-ink-50">No alerts raised.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
