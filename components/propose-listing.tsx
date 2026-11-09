"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PsxMatchPicker, type PsxResult } from "@/components/psx-match-picker";
import { Button } from "@/components/ui/button";
import { proposeListing } from "@/app/(app)/borrowers/actions";

export function ProposeListing({ borrowerId, borrowerName }: { borrowerId: string; borrowerName: string }) {
  const router = useRouter();
  const [q, setQ] = useState(borrowerName);
  const [pick, setPick] = useState<PsxResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/30"
        aria-label="Search PSX"
      />
      <PsxMatchPicker query={q} name="propose-symbol" onChange={setPick} />
      <Button
        size="sm"
        disabled={!pick || pending}
        onClick={() =>
          start(async () => {
            const r = await proposeListing(borrowerId, pick!.symbol);
            if (r.error) setErr(r.error);
            else router.refresh();
          })
        }
      >
        Propose PSX link for approval
      </Button>
      {err && <p className="text-xs text-risk-alert">{err}</p>}
    </div>
  );
}
