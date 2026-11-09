import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SBP_CLASS_LABELS, type BorrowerStatus, type SbpClass, type Severity } from "@/lib/domain";

const STATUS_TONE = { CLEAR: "clear", WATCH: "watch", ALERT: "alert" } as const;
const STATUS_LABEL = { CLEAR: "Clear", WATCH: "Watch", ALERT: "Alert" } as const;

export function StatusBadge({ status, title }: { status: BorrowerStatus; title?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} title={title}>
      <span
        className={cn("size-1.5 rounded-full", {
          "bg-risk-clear": status === "CLEAR",
          "bg-risk-watch": status === "WATCH",
          "bg-risk-alert": status === "ALERT",
        })}
      />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function ClassBadge({ cls }: { cls: SbpClass }) {
  const tone = cls === "REGULAR" ? "neutral" : cls === "OAEM" ? "watch" : "alert";
  return <Badge tone={tone}>{SBP_CLASS_LABELS[cls]}</Badge>;
}

export function StageBadge({ stage }: { stage: number }) {
  const tone = stage === 1 ? "neutral" : stage === 2 ? "watch" : "alert";
  return <Badge tone={tone}>Stage {stage}</Badge>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone = severity === "HIGH" ? "alert" : severity === "MEDIUM" ? "watch" : "neutral";
  const label = severity === "HIGH" ? "High" : severity === "MEDIUM" ? "Medium" : "Low";
  return <Badge tone={tone}>{label}</Badge>;
}

/** ORR grade chip, coloured by band; shows movement vs previous version. */
export function OrrChip({ grade, prev }: { grade: number | null; prev?: number | null }) {
  if (grade == null) return <span className="text-ink-50">n/a</span>;
  const tone = grade <= 5 ? "text-emerald bg-emerald-50" : grade <= 7 ? "text-risk-watch-ink bg-risk-watch-bg" : "text-risk-alert bg-risk-alert-bg";
  const moved = prev != null && prev !== grade ? grade - prev : 0;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("num inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold", tone)}>{grade}</span>
      {moved > 0 && <span className="num text-[11px] font-medium text-risk-alert" title={`Downgraded from ${prev}`}>▼{moved}</span>}
      {moved < 0 && <span className="num text-[11px] font-medium text-risk-clear" title={`Upgraded from ${prev}`}>▲{-moved}</span>}
    </span>
  );
}

export function CompositeScore({ score }: { score: number }) {
  const color = score >= 7 ? "bg-risk-alert" : score >= 4 ? "bg-risk-watch" : "bg-risk-clear";
  return (
    <span className="inline-flex items-center gap-2" title="Composite Risk Score (0–10), rolling 90 days">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-line">
        <span className={cn("block h-full rounded-full", color)} style={{ width: `${score * 10}%` }} />
      </span>
      <span className="num w-7 text-right text-xs font-medium">{score.toFixed(1)}</span>
    </span>
  );
}
