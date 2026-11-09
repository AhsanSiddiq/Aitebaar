import { requireUser } from "@/lib/auth";
import { getAlerts } from "@/lib/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertItem } from "@/components/alert-item";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await requireUser();
  const alerts = await getAlerts(user.lenderId);
  const groups = [
    { key: "OPEN", label: "Open" },
    { key: "ACKNOWLEDGED", label: "Acknowledged" },
    { key: "RESOLVED", label: "Resolved" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="mt-1 text-sm text-ink-50">Early-warning alerts across the book. Acknowledge / resolve actions arrive in build step 6.</p>
      </div>
      {groups.map((g) => {
        const list = alerts.filter((a) => a.status === g.key);
        if (!list.length) return null;
        return (
          <Card key={g.key}>
            <CardHeader>
              <CardTitle>{g.label}</CardTitle>
              <span className="num text-xs text-ink-50">{list.length}</span>
            </CardHeader>
            <CardContent className="space-y-5">
              {list.map((a) => (
                <AlertItem key={a.id} alert={a} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
