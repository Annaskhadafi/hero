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
        <p className="industrial-label">Riwayat Email</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">Pengiriman Email</h1>
        <p className="text-sm text-muted-foreground">
          Pantau email admin, notifikasi, dan pengingat yang dikirim dari HERO.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Terkirim", value: sent },
          { label: "Menunggu", value: pending },
          { label: "Gagal", value: failed },
        ].map((item) => (
          <Card key={item.label} className="rounded-lg">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Daftar Pengiriman Email</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailDeliveryLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
