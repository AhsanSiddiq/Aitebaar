"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import type { PortfolioRow } from "@/lib/db/queries";
import { SECTOR_LABELS, type BorrowerStatus } from "@/lib/domain";
import { ClassBadge, CompositeScore, OrrChip, StageBadge, StatusBadge } from "@/components/risk-badges";
import { Badge } from "@/components/ui/badge";
import { pkrMn } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "name" | "exposure" | "orr" | "frr" | "stage" | "classification" | "compositeScore" | "status";
const STATUS_ORDER: Record<BorrowerStatus, number> = { CLEAR: 0, WATCH: 1, ALERT: 2 };
const CLASS_ORDER = { REGULAR: 0, OAEM: 1, SUBSTANDARD: 2, DOUBTFUL: 3, LOSS: 4 };

function sortValue(r: PortfolioRow, k: SortKey): number | string {
  switch (k) {
    case "name": return r.name;
    case "status": return STATUS_ORDER[r.status] * 100 + r.compositeScore;
    case "classification": return CLASS_ORDER[r.classification];
    case "frr": return r.frr ?? "Z";
    case "orr": return r.orr ?? 99;
    default: return r[k];
  }
}

export function PortfolioTable({ rows }: { rows: PortfolioRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BorrowerStatus | "ALL">("ALL");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "status", dir: -1 });

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => status === "ALL" || r.status === status)
      .filter((r) => !needle || [r.name, r.ticker, r.groupName, SECTOR_LABELS[r.sector]].some((s) => s?.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const av = sortValue(a, sort.key), bv = sortValue(b, sort.key);
        const c = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
        return c * sort.dir || b.exposure - a.exposure;
      });
  }, [rows, q, status, sort]);

  const counts = useMemo(() => ({ ALL: rows.length, CLEAR: rows.filter((r) => r.status === "CLEAR").length, WATCH: rows.filter((r) => r.status === "WATCH").length, ALERT: rows.filter((r) => r.status === "ALERT").length }), [rows]);

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-3 py-2.5 font-medium", className)}>
      <button
        className="inline-flex items-center gap-1 hover:text-ink"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : k === "name" ? 1 : -1 }))}
      >
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search borrower, ticker, group, sector"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/30"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["ALL", "ALERT", "WATCH", "CLEAR"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "h-8 rounded-lg px-3 text-sm transition-colors",
                status === s ? "bg-ink text-white" : "text-ink-70 hover:bg-paper",
              )}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} <span className="num opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="text-left text-xs text-ink-50">
            <tr className="border-b border-line">
              <Th k="name" className="pl-4">Borrower</Th>
              <Th k="exposure" className="whitespace-nowrap text-right">Exposure, PKR m</Th>
              <Th k="orr">ORR</Th>
              <Th k="frr">FRR</Th>
              <Th k="stage">IFRS 9</Th>
              <Th k="classification">SBP class</Th>
              <Th k="compositeScore">Composite risk</Th>
              <Th k="status" className="pr-4">Status</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/borrowers/${r.id}`)}
                className={cn(
                  "cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-paper/70",
                  r.status === "ALERT" && "bg-risk-alert-bg/30",
                )}
              >
                <td className="py-3 pl-4 pr-3">
                  <Link href={`/borrowers/${r.id}`} className="font-medium text-ink hover:text-emerald" onClick={(e) => e.stopPropagation()}>
                    {r.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-50">
                    <span>{SECTOR_LABELS[r.sector]}</span>
                    <span>·</span>
                    <span>{r.listed ? `PSX: ${r.ticker}` : "Unlisted"}</span>
                    {r.groupName && <><span>·</span><span>{r.groupName}</span></>}
                    {r.restructured && <Badge tone="gold" className="px-1.5 py-0 text-[10px]">R-9 restructured</Badge>}
                  </div>
                </td>
                <td className="num px-3 py-3 text-right font-medium">{pkrMn(r.exposure)}</td>
                <td className="px-3 py-3"><OrrChip grade={r.orr} prev={r.orrPrev} /></td>
                <td className="num px-3 py-3 font-medium">{r.frr ?? "n/a"}</td>
                <td className="px-3 py-3"><StageBadge stage={r.stage} /></td>
                <td className="px-3 py-3"><ClassBadge cls={r.classification} /></td>
                <td className="px-3 py-3"><CompositeScore score={r.compositeScore} /></td>
                <td className="py-3 pl-3 pr-4"><StatusBadge status={r.status} title={r.statusReasons.join(" · ")} /></td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-50">No borrowers match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
