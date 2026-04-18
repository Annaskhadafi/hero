import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSecurityOverviewData } from "@/lib/hero-admin";

export default async function SecurityOverviewPage() {
  const { metrics, recentLogs } = await getSecurityOverviewData();

  return (
    <div className="space-y-6">
      <div>
        <p className="industrial-label">Governance</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">Security Overview</h1>
        <p className="text-sm text-muted-foreground">
          Monitor user control, access posture, dan event keamanan terbaru.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {metrics.map((metric) => (
          <Link
            key={metric.title}
            href={metric.href}
            className="flex min-h-10 min-w-[150px] items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] transition hover:bg-surface-container"
          >
            <span className="text-muted-foreground">{metric.title}</span>
            <span className="font-display text-base font-semibold text-foreground">{metric.value}</span>
          </Link>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>10 audit event terakhir dari modul governance</CardDescription>
            </div>
            <Link href="/dashboard/security/audit-logs">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                View All
              </Badge>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="surface-muted-card flex items-start justify-between gap-4 rounded-lg px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full font-mono">
                    {log.action}
                  </Badge>
                  <Badge variant="outline" className="rounded-full capitalize">
                    {log.severity}
                  </Badge>
                </div>
                <p className="text-sm text-foreground">{log.description}</p>
                <p className="text-xs text-muted-foreground">
                  {log.actorName ?? "System"} {log.actorEmail ? `• ${log.actorEmail}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {log.createdAt.toLocaleString("id-ID")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {[
          {
            title: "User Management",
            description: "Kelola user admin, status akses, dan struktur role.",
            href: "/dashboard/security/users",
          },
          {
            title: "Roles & Permissions",
            description: "Review izin per role sebelum dibuka ke semua site.",
            href: "/dashboard/security/roles",
          },
          {
            title: "Audit Logs",
            description: "Lihat jejak perubahan settings dan kontrol sistem.",
            href: "/dashboard/security/audit-logs",
          },
          {
            title: "Navbar Setting",
            description: "Kontrol struktur menu admin seperti referensi One Chitra.",
            href: "/dashboard/settings/navbar",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="min-w-[220px] flex-1 rounded-lg bg-surface-container-lowest px-4 py-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] transition hover:bg-surface-container-low"
          >
            <p className="font-display text-base font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
