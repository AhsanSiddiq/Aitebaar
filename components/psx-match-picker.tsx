"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PsxResult {
  symbol: string;
  name: string;
  sectorName: string | null;
  source: string;
  score: number;
  matchType: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Fuzzy PSX lookup as the user types a company name or ticker. The chosen
 * symbol is only a proposal: it goes to an Analyst/CRO for approval.
 */
export function PsxMatchPicker({ query, name = "symbol", onChange }: { query: string; name?: string; onChange?: (r: PsxResult | null) => void }) {
  const [results, setResults] = useState<PsxResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/psx/search?q=${encodeURIComponent(q)}&limit=6`, { signal: ctrl.signal });
        const data = (await res.json()) as { results: PsxResult[] };
        setResults(data.results ?? []);
        // Pre-select a high-confidence top match; the user can still change it.
        const top = data.results?.[0];
        setSelected((cur) => (cur && data.results.some((r) => r.symbol === cur) ? cur : top && top.confidence === "HIGH" ? top.symbol : ""));
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    onChange?.(results.find((r) => r.symbol === selected) ?? null);
  }, [selected, results, onChange]);

  return (
    <div className="rounded-lg border border-line">
      <input type="hidden" name={name} value={selected} />
      <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-ink-50">
        <span>PSX listing match</span>
        {loading && <Loader2 className="size-3.5 animate-spin" />}
      </div>
      <ul className="divide-y divide-line/70">
        {results.map((r) => (
          <li key={r.symbol}>
            <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm", selected === r.symbol && "bg-emerald-50")}>
              <input type="radio" name={`${name}-choice`} checked={selected === r.symbol} onChange={() => setSelected(r.symbol)} className="accent-emerald" />
              <span className="num w-14 shrink-0 font-semibold">{r.symbol}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.name}</span>
                <span className="block truncate text-xs text-ink-50">
                  {r.sectorName ?? "Sector n/a"}
                  {r.source === "SEED" && " · demo symbol"}
                </span>
              </span>
              <Badge tone={r.confidence === "HIGH" ? "clear" : r.confidence === "MEDIUM" ? "watch" : "neutral"} title={r.matchType.replaceAll("_", " ").toLowerCase()}>
                <span className="num">{Math.round(r.score * 100)}%</span>
              </Badge>
            </label>
          </li>
        ))}
        <li>
          <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm", selected === "" && "bg-paper")}>
            <input type="radio" name={`${name}-choice`} checked={selected === ""} onChange={() => setSelected("")} className="accent-emerald" />
            <span className="text-ink-70">{query.trim().length < 2 ? "Type a name or ticker to search PSX" : results.length ? "None of these: not listed on PSX" : "No PSX match: treat as unlisted"}</span>
          </label>
        </li>
      </ul>
    </div>
  );
}
