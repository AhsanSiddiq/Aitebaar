import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/db/prisma";
import { ROLE_LABELS, type Role } from "@/lib/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetDemoButton } from "./reset-demo-button";
import { pkrMn } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();
  if (!can(user.role, "admin.users")) {
    return <p className="text-sm text-ink-70">Admin is available to the Admin role only.</p>;
  }
  const [lender, users] = await Promise.all([
    prisma.lender.findUniqueOrThrow({ where: { id: user.lenderId } }),
    prisma.user.findMany({ where: { lenderId: user.lenderId }, orderBy: { role: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-ink-50">Tenant settings, users and demo controls. Reference-data editing (thresholds, PD/LGD tables, sector medians) arrives in build step 8.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tenant</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div><span className="text-ink-50">Name: </span>{lender.name}</div>
            <div><span className="text-ink-50">Institution type: </span>{lender.institutionType}</div>
            <div className="num"><span className="text-ink-50">Equity for R-1: </span>PKR {pkrMn(lender.equity)}m</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Demo data</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-ink-70">Restore the illustrative book to its original state before a pilot walkthrough.</p>
            <ResetDemoButton />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-ink-50">
              <tr className="border-b border-line">
                <th className="py-2.5 pl-5 pr-3 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="py-2.5 pl-3 pr-5 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/70 last:border-0">
                  <td className="py-3 pl-5 pr-3 font-medium">{u.name}</td>
                  <td className="px-3 py-3 text-ink-70">{u.email}</td>
                  <td className="py-3 pl-3 pr-5">{ROLE_LABELS[u.role as Role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
