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
      title="Site Operations Overview"
      description="Cross-module summary to monitor site operation health, critical queues, and daily management focus areas."
      badge={overview.site?.name}
    >
      <AdminMetricGrid items={overview.metrics} />

      <Tabs defaultValue="control" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="control">Control Center</TabsTrigger>
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="control">
          <AdminTableCard
            title="Control Center"
            description="Quick access to work areas that most often need action during the ongoing shift."
            columns={["Area", "Status", "Action"]}
            dateFilter={false}
            rows={[
              [
                "Field activity",
                "Monitor incoming activities, progress, and job site priorities.",
                <Link key="activities" href="/dashboard/activity-hub/my-day" className="text-sm font-semibold text-primary">
                  Open queue
                </Link>,
              ],
              [
                "Pending approvals",
                "Check pending approvals before they affect payroll and reports.",
                <Link key="approvals" href="/dashboard/approval" className="text-sm font-semibold text-primary">
                  Open approvals
                </Link>,
              ],
              [
                "Timesheet",
                "Review work hours, overtime, and payroll support status.",
                <Link key="timesheet" href="/dashboard/timesheet" className="text-sm font-semibold text-primary">
                  Open timesheet
                </Link>,
              ],
              [
                "Daily reports",
                "Ensure customer daily reports are ready to generate and send.",
                <Link key="reports" href="/dashboard/reports" className="text-sm font-semibold text-primary">
                  Open reports
                </Link>,
              ],
            ]}
          />
        </TabsContent>

        <TabsContent value="highlights">
          <AdminTableCard
            title="Operation Highlights"
            description="Quick highlights that help read site conditions without opening many modules."
            columns={["Metric", "Value"]}
            dateFilter={false}
            rows={[
              [
                "Top performer",
                highlights.topPerformer
                  ? `${highlights.topPerformer.name} • ${highlights.topPerformer.totalPoints} points`
                  : "No data yet",
              ],
              [
                "Latest report",
                highlights.report
                  ? `${highlights.report.readySections}/${highlights.report.totalSections} sections ready`
                  : "No report yet",
              ],
              [
                "Active customer",
                highlights.site?.customerName ?? "No customer yet",
              ],
              [
                "Contract number",
                highlights.site?.contractNumber ?? "No contract yet",
              ],
            ]}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}


