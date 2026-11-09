import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { matchConfidence } from "@/lib/psx/fuzzy";
import { dateShort, relativeDays } from "@/lib/format";
import { DecisionButtons } from "./decision-buttons";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const user = await requireUser();
  const links = await prisma.listingLink.findMany({
    where: { lenderId: user.lenderId },
    include: { borrower: { select: { id: true, name: true } }, psx: true },
    orderBy: { requestedAt: "desc" },
    take: 50,
  });
  const pending = links.filter((l) => l.status === "PENDING");
  const decided = links.filter((l) => l.status !== "PENDING");
  const canApprove = can(user.role, "listing.approve");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="mt-1 text-sm text-ink-50">PSX listing matches proposed for borrowers. An Analyst or CRO approves; nobody approves their own proposal.</p>
      </div>
      {done && <div className="rounded-lg border border-risk-clear/30 bg-risk-clear-bg px-4 py-3 text-sm text-risk-clear" role="status">{done}</div>}
      <Card>
        <CardHeader>
          <CardTitle>Pending PSX listing matches</CardTitle>
          <span className="num text-xs text-ink-50">{pending.length}</span>
        </CardHeader>
        <CardContent className="divide-y divide-line/70 py-0">
          {pending.map((l) => {
            const conf = matchConfidence(l.matchScore);
            return (
              <div key={l.id} className="grid gap-4 py-4 md:grid-cols-[1fr_280px]">
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/borrowers/${l.borrower.id}`} className="font-medium hover:text-emerald">{l.borrower.name}</Link>
                    <span className="text-ink-50">→</span>
                    <span className="num font-semibold">{l.symbol}</span>
                    <span className="text-ink-70">{l.psx.name}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-50">
                    <Badge tone={conf === "HIGH" ? "clear" : conf === "MEDIUM" ? "watch" : "alert"}>
                      <span className="num">{Math.round(l.matchScore * 100)}%</span> {conf.toLowerCase()} confidence
                    </Badge>
                    <span>{l.matchType.replaceAll("_", " ").toLowerCase()}</span>
                    <span>·</span>
                    <span>{l.psx.sectorName ?? "sector n/a"}</span>
                    {l.psx.source === "SEED" && <><span>·</span><span>demo symbol</span></>}
                    <span>·</span>
                    <span>proposed by {l.requestedBy} {relativeDays(l.requestedAt)}</span>
                  </div>
                </div>
                <DecisionButtons
                  linkId={l.id}
                  disabledReason={!canApprove ? "Waiting for an Analyst or CRO." : l.requestedById === user.id ? "You proposed this; another approver must decide." : undefined}
                />
              </div>
            );
          })}
          {pending.length === 0 && <p className="py-6 text-sm text-ink-50">Nothing waiting. New matches appear here when someone adds or links a borrower.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent decisions</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-ink-50">
              <tr className="border-b border-line">
                <th className="py-2.5 pl-5 pr-3 font-medium">Borrower</th>
                <th className="px-3 py-2.5 font-medium">PSX</th>
                <th className="px-3 py-2.5 font-medium">Decision</th>
                <th className="py-2.5 pl-3 pr-5 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((l) => (
                <tr key={l.id} className="border-b border-line/70 last:border-0">
                  <td className="py-3 pl-5 pr-3"><Link href={`/borrowers/${l.borrower.id}`} className="hover:text-emerald">{l.borrower.name}</Link></td>
                  <td className="num px-3 py-3">{l.symbol}</td>
                  <td className="px-3 py-3">
                    <Badge tone={l.status === "APPROVED" ? "clear" : "neutral"}>{l.status.toLowerCase()}</Badge>
                    {l.decisionNote && <div className="mt-1 text-xs text-ink-50">{l.decisionNote}</div>}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-xs text-ink-70">{l.decidedBy ?? "—"}{l.decidedAt && ` · ${dateShort(l.decidedAt)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
