import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProposeListing } from "@/components/propose-listing";
import { dateShort, pct, relativeDays } from "@/lib/format";
import { matchConfidence } from "@/lib/psx/fuzzy";
import { PSX_CONFIG } from "@/config/psx";
import { cn } from "@/lib/utils";
import type { getPsxView } from "@/lib/db/queries";

interface Props {
  borrowerId: string;
  borrowerName: string;
  listed: boolean;
  symbol: { symbol: string; name: string; sectorName: string | null; source: string } | null;
  financialsSource: string;
  pending: { symbol: string; name: string; score: number; requestedBy: string; requestedAt: Date } | null;
  view: Awaited<ReturnType<typeof getPsxView>> | null;
  canPropose: boolean;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${max === min ? 50 : 100 - ((v - min) / (max - min)) * 100}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-24" aria-hidden>
      <polyline points={pts} fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke" className={up ? "stroke-risk-clear" : "stroke-risk-alert"} style={{ strokeWidth: 1.5 }} />
    </svg>
  );
}

export function PsxListingCard({ borrowerId, borrowerName, listed, symbol, financialsSource, pending, view, canPropose }: Props) {
  const annual = view?.annual ?? {};
  const salesRow = Object.entries(annual).find(([k]) => /sales|revenue/i.test(k));
  const patRow = Object.entries(annual).find(([k]) => /after tax/i.test(k));
  const years = salesRow ? Object.keys(salesRow[1]).sort().reverse().slice(0, 3) : [];
  const fmtK = (v: number | null | undefined) => (v == null ? "n/a" : new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(v / 1000));

  return (
    <Card>
      <CardHeader>
        <CardTitle>PSX listing</CardTitle>
        {listed && symbol && <span className="num text-xs font-semibold">{symbol.symbol}</span>}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {listed && symbol ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{symbol.name}</div>
                <div className="text-xs text-ink-50">{symbol.sectorName ?? "Sector n/a"}{symbol.source === "SEED" && " · demo symbol"}</div>
              </div>
              {view?.lastClose != null && (
                <div className="flex items-center gap-2">
                  <Sparkline values={view.closes} />
                  <div className="text-right">
                    <div className="num whitespace-nowrap font-semibold">Rs {view.lastClose.toFixed(2)}</div>
                    {view.change30d != null && <div className={cn("num whitespace-nowrap text-xs", view.change30d >= 0 ? "text-risk-clear" : "text-risk-alert")}>{view.change30d >= 0 ? "+" : ""}{pct(view.change30d)} 30d</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-deep">
              {financialsSource === "PSX" ? "Financials and announcements come from PSX. No statements needed from the client." : "Listed, but financials are maintained manually."}
            </div>
            {years.length > 0 && (
              <table className="w-full text-xs">
                <thead className="text-ink-50"><tr><th className="py-1 text-left font-medium">PKR m (PSX)</th>{years.map((y) => <th key={y} className="num py-1 text-right font-medium">{y}</th>)}</tr></thead>
                <tbody>
                  {salesRow && <tr><td className="py-1">Sales</td>{years.map((y) => <td key={y} className="num py-1 text-right">{fmtK(salesRow[1][y])}</td>)}</tr>}
                  {patRow && <tr><td className="py-1">Profit after tax</td>{years.map((y) => <td key={y} className="num py-1 text-right">{fmtK(patRow[1][y])}</td>)}</tr>}
                </tbody>
              </table>
            )}
            <div className="text-xs text-ink-50">
              {view?.fetchedAt ? <>Last PSX sync {relativeDays(view.fetchedAt)} ({dateShort(view.fetchedAt)}){view.source === "SEED" && " · offline demo data"}</> : "Not synced yet."}
              {view?.lastRun?.status === "FAILED" && <span className="text-risk-alert"> · last attempt failed: {view.lastRun.message}</span>}
              {symbol.source !== "SEED" && (
                <> · <a href={`${PSX_CONFIG.baseUrl}${PSX_CONFIG.endpoints.company(symbol.symbol)}`} target="_blank" rel="noreferrer" className="text-emerald hover:underline">PSX page</a></>
              )}
            </div>
          </>
        ) : pending ? (
          <div className="rounded-lg bg-risk-watch-bg px-3 py-2.5 text-risk-watch-ink">
            <div className="font-medium">Match pending approval</div>
            <div className="mt-0.5 text-xs">
              <span className="num font-semibold">{pending.symbol}</span> · {pending.name} ·{" "}
              <Badge tone="neutral" className="num">{Math.round(pending.score * 100)}% {matchConfidence(pending.score).toLowerCase()}</Badge>
              <div className="mt-1">Proposed by {pending.requestedBy} {relativeDays(pending.requestedAt)}. An Analyst or CRO approves it in Approvals.</div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-ink-70">Not linked to a PSX listing. Financials are uploaded or entered manually.</p>
            {canPropose && <ProposeListing borrowerId={borrowerId} borrowerName={borrowerName} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
