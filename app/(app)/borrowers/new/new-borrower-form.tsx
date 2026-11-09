"use client";

import { useActionState, useState } from "react";
import { PsxMatchPicker } from "@/components/psx-match-picker";
import { Button } from "@/components/ui/button";
import { SECTORS, SECTOR_LABELS } from "@/lib/domain";
import { createBorrower } from "../actions";

const field = "mt-1 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/30";

export function NewBorrowerForm() {
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(createBorrower, {});
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Company name or PSX ticker</span>
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="e.g. Summit Cement" autoComplete="off" required />
      </label>
      <div>
        <PsxMatchPicker query={name} />
        <p className="mt-1.5 text-xs text-ink-50">
          A PSX match is sent to an Analyst or CRO for approval. Once approved, the borrower is treated as listed and its financials and announcements come from PSX, so you don&apos;t need to ask the client for statements.
        </p>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Sector</span>
        <select name="sector" className={field} defaultValue="" required>
          <option value="" disabled>Choose a sector</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium">Short description <span className="font-normal text-ink-50">(optional)</span></span>
        <textarea name="description" rows={3} className={`${field} h-auto py-2`} />
      </label>
      {state?.error && <p className="text-sm text-risk-alert">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create borrower"}</Button>
    </form>
  );
}
