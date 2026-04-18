import Link from "next/link";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminTableCard } from "@/components/admin-table-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboardOverview, getExecutiveHighlights } from "@/lib/hero-admin";

export default async function AnalyticsPage() {
  const [overview, highlights] = await Promise.all([
    getDashboardOverview(),
    getExecutiveHighlights(),
  ]);

  return (
    <AdminPageShell
      eyebrow="M8 • Dashboard & Analytics"
      title="Executive Site Dashboard"
      description="Ringkasan utama lintas modul untuk admin, PJO, dan manajemen. Semua angka di bawah ini dibaca dari PostgreSQL melalui Drizzle sebagai fondasi backend web admin."
      badge={overview.site?.name}
    >
      <AdminMetricGrid items={overview.metrics} />

      <Tabs defaultValue="control" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="control">Control Tower</TabsTrigger>
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="control">
          <AdminTableCard
            title="Control Tower"
            description="Shortcut cepat untuk membuka area operasional yang perlu perhatian."
            columns={["Area", "Status", "Action"]}
            dateFilter={false}
            rows={[
              [
                "Activities",
                "Pantau aktivitas masuk, progress, dan prioritas job site.",
                <Link key="activities" href="/dashboard/activity-hub/my-day" className="text-sm font-semibold text-primary">
                  Open queue
                </Link>,
              ],
              [
                "Approvals",
                "Cek approval yang tertahan sebelum mempengaruhi payroll dan report.",
                <Link key="approvals" href="/dashboard/approval" className="text-sm font-semibold text-primary">
                  Open approvals
                </Link>,
              ],
              [
                "Timesheet",
                "Review jam kerja, lembur, dan status payroll support.",
                <Link key="timesheet" href="/dashboard/timesheet" className="text-sm font-semibold text-primary">
                  Open timesheet
                </Link>,
              ],
              [
                "Reports",
                "Pastikan daily report customer siap generate dan kirim.",
                <Link key="reports" href="/dashboard/reports" className="text-sm font-semibold text-primary">
                  Open reports
                </Link>,
              ],
            ]}
          />
        </TabsContent>

        <TabsContent value="highlights">
          <AdminTableCard
            title="Highlights"
            description="Ringkasan singkat untuk admin dan eksekutif."
            columns={["Metric", "Value"]}
            dateFilter={false}
            rows={[
              [
                "Top performer",
                highlights.topPerformer
                  ? `${highlights.topPerformer.name} • ${highlights.topPerformer.totalPoints} poin`
                  : "Belum ada data",
              ],
              [
                "Latest report",
                highlights.report
                  ? `${highlights.report.readySections}/${highlights.report.totalSections} sections ready`
                  : "Belum ada report",
              ],
              [
                "Customer",
                highlights.site?.customerName ?? "Belum ada customer",
              ],
              [
                "Contract",
                highlights.site?.contractNumber ?? "Belum ada kontrak",
              ],
            ]}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
