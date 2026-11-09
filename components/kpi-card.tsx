import { cn } from "@/lib/utils";

export function KpiCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: "alert" | "watch" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-50">{label}</div>
      <div
        className={cn("num mt-1.5 font-display text-xl sm:text-2xl font-semibold text-ink", {
          "text-risk-alert": accent === "alert",
          "text-risk-watch-ink": accent === "watch",
        })}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-50">{sub}</div>}
    </div>
  );
}
