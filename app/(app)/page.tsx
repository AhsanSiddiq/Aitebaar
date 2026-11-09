import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPortfolio } from "@/lib/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { PortfolioTable } from "@/components/portfolio-table";
import { ConcentrationWidget } from "@/components/concentration-widget";
import { AlertItem } from "@/components/alert-item";
import { pct, pkrCompact, pkrMn } from "@/lib/format";
import { orrGrade } from "@/config/grades";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const { lender, rows, alerts, kpis, concentration } = await getPortfolio(user.lenderId);
  const openAlerts = alerts.filter((a) => a.status === "OPEN");
  const nearLimits = concentration.filter((c) => c.level !== "OK").length;
  const stageExposure = (s: 1 | 2 | 3) => kpis.byStage.find((x) => x.stage === s)!.exposure;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="mt-1 text-sm text-ink-50">
            {lender.name} · {kpis.borrowerCount} borrowers · as of {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <BookMix byStatus={kpis.byStatus} total={kpis.totalExposure} />
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Key indicators">
        <KpiCard label="Total exposure" value={pkrCompact(kpis.totalExposure)} sub={`Funded + non-funded outstanding`} />
        <KpiCard label="Borrowers" value={kpis.borrowerCount} sub={`${kpis.byStatus.find((s) => s.status === "ALERT")!.count} alert · ${kpis.byStatus.find((s) => s.status === "WATCH")!.count} watch`} />
        <KpiCard
          label="Weighted ORR"
          value={kpis.weightedOrr ? kpis.weightedOrr.toFixed(2) : "n/a"}
          sub={kpis.weightedOrr ? `Exposure-weighted · ≈ ${orrGrade(Math.round(kpis.weightedOrr)).label}` : undefined}
        />
        <KpiCard
          label="Open alerts"
          value={kpis.openAlerts}
          accent={kpis.highAlerts > 0 ? "alert" : undefined}
          sub={`${kpis.highAlerts} high severity`}
        />
        <KpiCard
          label="Stage 2 + 3"
          value={pct((stageExposure(2) + stageExposure(3)) / kpis.totalExposure)}
          accent="watch"
          sub={`PKR ${pkrMn(stageExposure(2))}m S2 · ${pkrMn(stageExposure(3))}m S3`}
        />
        <KpiCard label="ECL held" value={pkrCompact(kpis.totalEcl)} sub={`${pct(kpis.eclCoverage, 2)} of exposure`} />
      </section>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Borrowers</CardTitle>
            <span className="text-xs text-ink-50">Click a row to open the borrower</span>
          </CardHeader>
          <PortfolioTable rows={rows} />
        </Card>

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 2xl:grid-cols-1">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <Link href="/alerts" className="text-xs font-medium text-emerald hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {openAlerts.slice(0, 5).map((a) => (
                <AlertItem key={a.id} alert={a} compact />
              ))}
              {openAlerts.length === 0 && <p className="text-sm text-ink-50">No open alerts. The book is quiet.</p>}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Concentration (R-1)</CardTitle>
              {nearLimits > 0 && <span className="text-xs font-medium text-risk-watch-ink">{nearLimits} near limit</span>}
            </CardHeader>
            <CardContent>
              <ConcentrationWidget rows={concentration} equity={lender.equity} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BookMix({ byStatus, total }: { byStatus: { status: "CLEAR" | "WATCH" | "ALERT"; exposure: number; count: number }[]; total: number }) {
  const color = { CLEAR: "bg-risk-clear", WATCH: "bg-risk-watch", ALERT: "bg-risk-alert" };
  const label = { CLEAR: "Clear", WATCH: "Watch", ALERT: "Alert" };
  return (
    <div className="w-full max-w-sm sm:w-80">
      <div className="mb-1.5 text-xs font-medium text-ink-50">Exposure by status</div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
        {byStatus.map((s) => (
          <div key={s.status} className={color[s.status]} style={{ width: `${(s.exposure / total) * 100}%` }} title={`${label[s.status]}: ${pct(s.exposure / total)}`} />
        ))}
      </div>
      <div className="mt-1.5 flex gap-4 text-xs text-ink-70">
        {byStatus.map((s) => (
          <span key={s.status} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${color[s.status]}`} />
            {label[s.status]} <span className="num text-ink-50">{pct(s.exposure / total, 0)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
