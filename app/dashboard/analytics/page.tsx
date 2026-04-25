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
      title="Ringkasan Operasi Site"
      description="Ringkasan lintas modul untuk memantau kesehatan operasi site, antrian penting, dan fokus kerja harian manajemen."
      badge={overview.site?.name}
    >
      <AdminMetricGrid items={overview.metrics} />

      <Tabs defaultValue="control" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="control">Pusat kendali</TabsTrigger>
          <TabsTrigger value="highlights">Sorotan</TabsTrigger>
        </TabsList>

        <TabsContent value="control">
          <AdminTableCard
            title="Pusat kendali"
            description="Masuk cepat ke area kerja yang paling sering butuh tindakan pada shift berjalan."
            columns={["Area", "Status", "Action"]}
            dateFilter={false}
            rows={[
              [
                "Aktivitas lapangan",
                "Pantau aktivitas masuk, progress, dan prioritas job site.",
                <Link key="activities" href="/dashboard/activity-hub/my-day" className="text-sm font-semibold text-primary">
                  Buka antrean
                </Link>,
              ],
              [
                "Approval tertahan",
                "Cek approval yang tertahan sebelum mempengaruhi payroll dan report.",
                <Link key="approvals" href="/dashboard/approval" className="text-sm font-semibold text-primary">
                  Buka approval
                </Link>,
              ],
              [
                "Timesheet",
                "Review jam kerja, lembur, dan status payroll support.",
                <Link key="timesheet" href="/dashboard/timesheet" className="text-sm font-semibold text-primary">
                  Buka timesheet
                </Link>,
              ],
              [
                "Laporan harian",
                "Pastikan daily report customer siap generate dan kirim.",
                <Link key="reports" href="/dashboard/reports" className="text-sm font-semibold text-primary">
                  Buka laporan
                </Link>,
              ],
            ]}
          />
        </TabsContent>

        <TabsContent value="highlights">
          <AdminTableCard
            title="Sorotan operasi"
            description="Sorotan cepat yang membantu membaca kondisi site tanpa membuka banyak modul."
            columns={["Metric", "Value"]}
            dateFilter={false}
            rows={[
              [
                "Peraih poin tertinggi",
                highlights.topPerformer
                  ? `${highlights.topPerformer.name} • ${highlights.topPerformer.totalPoints} poin`
                  : "Belum ada data",
              ],
              [
                "Laporan terbaru",
                highlights.report
                  ? `${highlights.report.readySections}/${highlights.report.totalSections} section siap`
                  : "Belum ada report",
              ],
              [
                "Customer aktif",
                highlights.site?.customerName ?? "Belum ada customer",
              ],
              [
                "Nomor kontrak",
                highlights.site?.contractNumber ?? "Belum ada kontrak",
              ],
            ]}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}


