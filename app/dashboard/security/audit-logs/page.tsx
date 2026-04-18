import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityAuditLogTable } from "@/components/security-audit-log-table";
import { getAuditLogsPageData } from "@/lib/hero-admin";

export default async function AuditLogsPage() {
  const logs = await getAuditLogsPageData();

  return (
    <div className="space-y-6">
      <div>
        <p className="industrial-label">Riwayat Keamanan</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">Catatan Aktivitas</h1>
        <p className="text-sm text-muted-foreground">
          Pantau perubahan akses, pengaturan, dan aktivitas keamanan di HERO.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Riwayat Aktivitas Keamanan</CardTitle>
          <CardDescription>
            Daftar aktivitas penting yang perlu dipantau oleh admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecurityAuditLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
