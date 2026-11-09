"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { decideListing } from "../borrowers/actions";

export function DecisionButtons({ linkId, disabledReason }: { linkId: string; disabledReason?: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const decide = (d: "APPROVED" | "REJECTED") =>
    start(async () => {
      const r = await decideListing(linkId, d, note);
      if (r.error) setMsg({ ok: false, text: r.error });
      else router.push(`/approvals?done=${encodeURIComponent(r.message ?? (d === "APPROVED" ? "Approved." : "Rejected."))}`);
    });
  if (disabledReason) return <p className="text-xs text-ink-50">{disabledReason}</p>;
  return (
    <div className="space-y-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (required to reject)"
        className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/30"
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide("APPROVED")}>Approve</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("REJECTED")}>Reject</Button>
      </div>
      {msg && <p className={msg.ok ? "text-xs text-risk-clear" : "text-xs text-risk-alert"}>{msg.text}</p>}
    </div>
  );
}
