"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetDemo } from "./actions";

export function ResetDemoButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!confirm("Reset the demo? All changes in Demo Lender Ltd will be replaced with fresh seed data.")) return;
          start(async () => {
            const r = await resetDemo();
            if (r.ok) {
              setMsg(`Reseeded ${r.borrowers} borrowers.`);
              router.refresh();
            } else setMsg(r.error);
          });
        }}
      >
        <RotateCcw className="size-4" />
        {pending ? "Resetting…" : "Reset demo data"}
      </Button>
      {msg && <span className="text-sm text-ink-70">{msg}</span>}
    </div>
  );
}
