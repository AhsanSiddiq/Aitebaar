import Link from "next/link";
import { AlertTriangle, Building2, FileWarning, Gauge, Newspaper, TrendingDown, type LucideIcon } from "lucide-react";
import { ALERT_TYPE_LABELS, type AlertType, type Severity } from "@/lib/domain";
import { relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<AlertType, LucideIcon> = {
  RATING_DOWNGRADE: TrendingDown,
  STAGE_MIGRATION: Gauge,
  HIGH_IMPACT_NEWS: Newspaper,
  EXCHANGE_EVENT: Building2,
  COVENANT_BREACH: FileWarning,
  EXPOSURE_LIMIT: AlertTriangle,
};

export interface AlertItemData {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  createdAt: Date;
  borrower: { id: string; name: string } | null;
}

export function AlertItem({ alert, compact }: { alert: AlertItemData; compact?: boolean }) {
  const type = alert.type as AlertType;
  const sev = alert.severity as Severity;
  const Icon = ICONS[type] ?? AlertTriangle;
  return (
    <div className="flex gap-3">
      <div
        className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", {
          "bg-risk-alert-bg text-risk-alert": sev === "HIGH",
          "bg-risk-watch-bg text-risk-watch-ink": sev === "MEDIUM",
          "bg-paper text-ink-50 ring-1 ring-inset ring-line": sev === "LOW",
        })}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-sm font-medium">{alert.title}</div>
          <div className="shrink-0 text-[11px] text-ink-50">{relativeDays(alert.createdAt)}</div>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-50">
          {alert.borrower && (
            <Link href={`/borrowers/${alert.borrower.id}`} className="font-medium text-ink-70 hover:text-emerald">
              {alert.borrower.name}
            </Link>
          )}
          {alert.borrower && <span>·</span>}
          <span>{ALERT_TYPE_LABELS[type]}</span>
          {alert.status !== "OPEN" && (
            <>
              <span>·</span>
              <span className="capitalize">{alert.status.toLowerCase()}</span>
            </>
          )}
        </div>
        {!compact && <p className="mt-1 text-sm text-ink-70">{alert.message}</p>}
      </div>
    </div>
  );
}
