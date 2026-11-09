import Link from "next/link";
import type { ConcentrationRow } from "@/lib/finance/concentration";
import { R1_LIMITS } from "@/config/regulatory";
import { pct, pkrMn } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ConcentrationWidget({ rows, equity }: { rows: (ConcentrationRow & { members?: string[] })[]; equity: number }) {
  const top = rows.slice(0, 6);
  return (
    <div>
      <p className="text-xs text-ink-50">
        R-1 limits on equity of PKR {pkrMn(equity)}m: single borrower {pct(R1_LIMITS.singleBorrower, 0)}, group {pct(R1_LIMITS.group, 0)}. Flag at {pct(R1_LIMITS.warnAt, 0)} of limit.
      </p>
      <ul className="mt-4 space-y-3.5">
        {top.map((r) => {
          const w = Math.min(100, r.utilisation * 100);
          return (
            <li key={`${r.kind}-${r.id}`}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {r.kind === "BORROWER" ? (
                    <Link href={`/borrowers/${r.id}`} className="font-medium hover:text-emerald">{r.name}</Link>
                  ) : (
                    <span className="font-medium" title={r.members?.join(", ")}>{r.name}</span>
                  )}
                  <span className="ml-1.5 text-xs text-ink-50">{r.kind === "GROUP" ? "group" : "single"}</span>
                </span>
                <span
                  className={cn("num shrink-0 text-xs font-medium", {
                    "text-risk-alert": r.level === "BREACH",
                    "text-risk-watch-ink": r.level === "NEAR",
                    "text-ink-50": r.level === "OK",
                  })}
                >
                  {pct(r.utilisation, 0)} of limit
                </span>
              </div>
              <div className="relative mt-1.5 h-2 rounded-full bg-paper ring-1 ring-inset ring-line">
                <div
                  className={cn("h-full rounded-full", {
                    "bg-risk-alert": r.level === "BREACH",
                    "bg-risk-watch": r.level === "NEAR",
                    "bg-emerald": r.level === "OK",
                  })}
                  style={{ width: `${w}%` }}
                />
                <div className="absolute top-[-3px] h-[14px] w-px bg-ink/40" style={{ left: `${R1_LIMITS.warnAt * 100}%` }} title="Warning threshold" />
              </div>
              <div className="num mt-1 text-[11px] text-ink-50">
                PKR {pkrMn(r.exposure)}m of {pkrMn(r.limit)}m · {pct(r.shareOfEquity)} of equity
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
