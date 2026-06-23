import type { ReactNode } from "react";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminTableCard } from "@/components/admin-table-card";
import {
  DisputeReviewActions,
  PenaltyEventCrudForm,
  PointEventCrudForm,
  PointEventRowActions,
} from "@/components/operational-crud-panels";
import { PointEventImportButton } from "@/components/point-event-import-button";
import { PointsHrInteractiveDashboard } from "@/components/points-hr-interactive-dashboard";
import { BadgeConfigPanel, LevelConfigPanel } from "@/components/gamification-config-panels";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOperationalCrudOptions, getPointsAnalyticsPageData } from "@/lib/hero-admin";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";

function formatPoint(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID")}`;
}

function statusBadge(label: string, tone: "good" | "warn" | "bad" | "neutral" = "neutral") {
  const className = {
    good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    bad: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    neutral: "bg-surface-container text-muted-foreground",
  }[tone];

  return <Badge className={`rounded-full px-2.5 py-1 text-[11px] ${className}`}>{label}</Badge>;
}

function InsightCard({ title, value, body }: { title: string; value: ReactNode; body: string }) {
  return (
    <Card className="surface-module-card rounded-[1.2rem] border-0 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="mt-3 font-display text-2xl font-semibold text-foreground">{value}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </Card>
  );
}

export default async function LeaderboardPage() {
  const [data, options, role] = await Promise.all([
    getPointsAnalyticsPageData(),
    getOperationalCrudOptions(),
    getCurrentEmployeeAccessRole(),
  ]);
  const { analytics, analyticsLeaderboard, disputes, allLevels, allBadges } = data;
  const { hrManualHistory } = analytics;
  const topPerformer = analyticsLeaderboard[0];
  const reviewQueue = analyticsLeaderboard.filter((row) => row.needsReview).slice(0, 25);
  const interactiveTimeline = analytics.unifiedTimeline.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
  const canManage = role === 'Super Admin' || role === 'HC Manager';

  return (
    <AdminPageShell
      eyebrow="HR Points System"
      title="Points, Badge & Performance Dashboard"
      description="Dashboard simple untuk HR: lihat performa orang, tambah poin, kelola badge, penalty, dan dispute tanpa pindah banyak halaman."
      badge={topPerformer ? `Top • ${topPerformer.name}` : undefined}
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Active employees", value: `${analytics.activeEmployees}`, meta: "punya poin aktif" },
          { label: "Average points", value: `${analytics.averagePoints}`, meta: "rata-rata skor" },
          { label: "Reward points", value: `${analytics.rewardPoints}`, meta: "bulan berjalan" },
          { label: "Penalty points", value: `${analytics.penaltyPoints}`, meta: "potongan bulan ini" },
          { label: "Open disputes", value: `${analytics.openDisputes}`, meta: "butuh review HR" },
          { label: "No activity", value: `${analytics.employeesWithoutActivity}`, meta: "belum ada poin bulan ini" },
        ]}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="overview">Overview HR</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="actions">HR Actions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <InsightCard
              title="Top Improver"
              value={analytics.topImprover?.name ?? "-"}
              body={`${formatPoint(analytics.topImprover?.periodPoints ?? 0)} poin bulan ini. Cocok untuk kandidat reward / apresiasi.`}
            />
            <InsightCard
              title="Needs Attention"
              value={analytics.biggestDrop?.name ?? "-"}
              body={`${formatPoint(analytics.biggestDrop?.periodPoints ?? 0)} poin bulan ini. Cek penalty, telat, SP, atau dispute.`}
            />
            <InsightCard
              title="Simple Flow"
              value="Input → Approve → HR Review"
              body="Section Head list pekerjaan, PJO approve, HR analisa poin dan tindakan lanjutan."
            />
          </div>

          <PointsHrInteractiveDashboard
            leaderboard={analyticsLeaderboard}
            departments={analytics.departmentPerformance}
            timeline={interactiveTimeline}
          />

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <AdminTableCard
              title="Department Performance"
              description="Ringkasan cepat agar HR tahu section/dept mana yang aktif, turun, atau banyak penalty."
              columns={["Department", "Employees", "Period Points", "Penalty", "Signal"]}
              dateFilter={false}
              showImport={false}
              rows={analytics.departmentPerformance.map((row) => [
                row.department,
                `${row.employees}`,
                formatPoint(row.points),
                `-${row.penalties}`,
                row.penalties > 0 ? statusBadge("Review", "warn") : statusBadge("OK", "good"),
              ])}
            />

            <Card className="surface-module-card rounded-[1.2rem] border-0 p-5">
              <h3 className="font-display text-base font-semibold text-foreground">Workflow Role</h3>
              <div className="mt-4 space-y-3">
                {analytics.hrWorkflow.map((item, index) => (
                  <div key={item.title} className="rounded-2xl bg-surface-container-low p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                      <p className="font-semibold text-foreground">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <AdminTableCard
            title="HR Leaderboard"
            description="Ranking utama dengan delta bulan berjalan, penalty, dan sinyal review."
            columns={["Rank", "Employee", "Role", "Department", "Level", "Total", "This Month", "Penalty", "Signal"]}
            dateFilter={false}
            showImport={false}
            rows={analyticsLeaderboard.map((row) => [
              `#${row.rank}`,
              row.name,
              row.role,
              row.department,
              row.levelName,
              row.totalPoints.toLocaleString("id-ID"),
              formatPoint(row.periodPoints),
              row.penaltyPoints ? `-${row.penaltyPoints}` : "0",
              row.needsReview
                ? statusBadge(row.trend === "Turun" ? "Turun" : "Review", row.trend === "Turun" ? "bad" : "warn")
                : statusBadge(row.trend, row.trend === "Naik" ? "good" : "neutral"),
            ])}
          />

          <AdminTableCard
            title="Unified Point Timeline"
            description="Reward, adjustment, dan penalty digabung agar HR cepat membaca sebab perubahan poin."
            columns={["Employee", "Type", "Category", "Label", "Points", "Date", ...(canManage ? ["Actions"] : [])]}
            dateFilter
            showImport={false}
            rows={analytics.unifiedTimeline.map((row) => [
              row.employeeName,
              row.points > 0
                ? <Badge key={`type-${row.id}`} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{row.type}</Badge>
                : <Badge key={`type-${row.id}`} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{row.type}</Badge>,
              row.category,
              row.label,
              formatPoint(row.points),
              row.createdAt.toLocaleDateString("id-ID"),
              ...(canManage ? [
                row.eventType === 'point' ? (
                  <PointEventRowActions
                    key={row.id}
                    row={{ id: row.eventId, employeeId: row.employeeId, category: row.category, label: row.label, points: row.points }}
                    employees={options.employees}
                    categoryOptions={options.categoryOptions}
                  />
                ) : null,
              ] : []),
            ])}
            rowAttributes={analytics.unifiedTimeline.map((row) => ({ "data-date-value": row.createdAt.toISOString() }))}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <PointEventCrudForm employees={options.employees} categoryOptions={options.categoryOptions} />
            <PenaltyEventCrudForm employees={options.employees} />
          </div>

          <AdminTableCard
            title="Review Queue"
            description="Orang yang perlu dicek HR karena penalty, penurunan poin, atau dispute terbuka."
            columns={["Employee", "Department", "Total", "This Month", "Penalty", "Action"]}
            dateFilter={false}
            showImport={false}
            rows={reviewQueue.map((row) => [
              row.name,
              row.department,
              row.totalPoints.toLocaleString("id-ID"),
              formatPoint(row.periodPoints),
              row.penaltyPoints ? `-${row.penaltyPoints}` : "0",
              statusBadge("Check employee", row.periodPoints < 0 ? "bad" : "warn"),
            ])}
          />

          <AdminTableCard
            title="Open Disputes"
            description="Penalty yang diprotes karyawan dan butuh keputusan HR/PJO."
            columns={["Employee", "Penalty", "Deducted", "Reason", "Date", "Review"]}
            dateFilter
            showImport={false}
            rows={disputes.map((row) => [
              row.employeeName,
              row.penaltyCode,
              `-${row.pointsDeducted}`,
              row.reason,
              row.createdAt.toLocaleDateString("id-ID"),
              row.status === "pending" ? <DisputeReviewActions key={row.id} disputeId={row.id} /> : statusBadge(row.status, "neutral"),
            ])}
            rowAttributes={disputes.map((row) => ({ "data-date-value": row.createdAt.toISOString() }))}
          />

          <AdminTableCard
            title="HR Manual History"
            description="Riwayat penambahan/pengurangan poin secara manual oleh HR."
            columns={["Date", "Employee", "Action", "Detail", "Points"]}
            dateFilter
            showImport={false}
            rows={hrManualHistory.map((row) => [
              new Date(row.createdAt).toLocaleDateString("id-ID"),
              row.employeeName,
              <Badge key={`act-${row.id}`} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${row.points < 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>{row.action}</Badge>,
              row.detail,
              <span key={`pts-${row.id}`} className={`font-semibold tabular-nums ${row.points < 0 ? "text-amber-600" : "text-emerald-600"}`}>{row.points > 0 ? "+" : ""}{row.points.toLocaleString("id-ID")}</span>,
            ])}
            rowAttributes={hrManualHistory.map((row) => ({ "data-date-value": new Date(row.createdAt).toISOString() }))}
          />

          <div className="flex flex-wrap items-center gap-2 rounded-[1.2rem] bg-surface-container-low p-4">
            <PointEventImportButton />
            <span className="text-sm text-muted-foreground">Import massal tetap tersedia, tapi daily use HR cukup pakai form tambah poin/penalty.</span>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <LevelConfigPanel levels={allLevels} />
          <BadgeConfigPanel badges={allBadges} />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
