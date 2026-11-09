import type { RatioFormat } from "@/config/ratios";

const nf = (d: number) => new Intl.NumberFormat("en-PK", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Amounts are stored in PKR millions. */
export function pkrMn(v: number | null | undefined, digits = 0): string {
  if (v == null) return "n/a";
  return `${nf(digits).format(v)}`;
}

/** Compact PKR: 25,900 mn → "PKR 25.9bn". */
export function pkrCompact(mn: number | null | undefined): string {
  if (mn == null) return "n/a";
  if (Math.abs(mn) >= 1000) return `PKR ${nf(1).format(mn / 1000)}bn`;
  return `PKR ${nf(0).format(mn)}m`;
}

export function pct(v: number | null | undefined, digits = 1): string {
  if (v == null) return "n/a";
  return `${nf(digits).format(v * 100)}%`;
}

export function ratio(v: number | null | undefined, format: RatioFormat): string {
  if (v == null) return "n/a";
  switch (format) {
    case "x":
      return `${nf(2).format(v)}x`;
    case "pct":
      return pct(v);
    case "days":
      return `${nf(0).format(v)}d`;
    case "pkr":
      return pkrMn(v);
  }
}

export function dateShort(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function relativeDays(d: Date | string, now = new Date()): string {
  const days = Math.round((now.getTime() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const m = Math.round(days / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}
