import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailDeliveryLogTable } from "@/components/email-delivery-log-table";
import { getEmailDeliveryLogsData } from "@/lib/hero-admin";

export default async function EmailSettingsPage() {
  const logs = await getEmailDeliveryLogsData();
  const sent = logs.filter((log) => log.status === "sent").length;
  const pending = logs.filter((log) => log.status === "pending").length;
  const failed = logs.filter((log) => log.status === "failed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Delivery Log</h1>
        <p className="text-sm text-muted-foreground">
          Audit trail untuk email delivery admin, notifikasi, dan reminder yang keluar dari HERO.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Delivered", value: sent },
          { label: "Pending", value: pending },
          { label: "Failed", value: failed },
        ].map((item) => (
          <Card key={item.label} className="rounded-2xl">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Email Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailDeliveryLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
