"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PsxSyncPanel() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (kind: "symbols" | "linked") =>
    start(async () => {
      const res = await fetch("/api/psx/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
      const data = await res.json();
      setMsg(res.ok ? { ok: true, text: `${data.source}: ${JSON.stringify(data.result).slice(0, 160)}` } : { ok: false, text: data.error ?? `Failed (${res.status})` });
      router.refresh();
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("symbols")}>
          <RefreshCw className="size-4" /> Sync PSX symbol list
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("linked")}>
          <RefreshCw className="size-4" /> Sync listed borrowers
        </Button>
      </div>
      {pending && <p className="text-xs text-ink-50">Syncing…</p>}
      {msg && <p className={msg.ok ? "break-all text-xs text-risk-clear" : "text-xs text-risk-alert"}>{msg.text}</p>}
    </div>
  );
}
