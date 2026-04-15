import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityAuditLogTable } from "@/components/security-audit-log-table";
import { getAuditLogsPageData } from "@/lib/hero-admin";

export default async function AuditLogsPage() {
  const logs = await getAuditLogsPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Track semua perubahan governance, security, dan settings dari backend HERO.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Security Audit Trail</CardTitle>
          <CardDescription>
            Tabel audit yang mengikuti pola halaman audit logs dari referensi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecurityAuditLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
