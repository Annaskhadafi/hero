import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminTableCard } from "@/components/admin-table-card";
import { 
  PointEventCrudForm, 
  PointEventRowActions,
  PenaltyEventCrudForm,
  DisputeReviewActions
} from "@/components/operational-crud-panels";
import { LevelConfigPanel, BadgeConfigPanel } from "@/components/gamification-config-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOperationalCrudOptions, getPointsPageData } from "@/lib/hero-admin";

export default async function LeaderboardPage() {
  const [{ leaderboard, recentPointEvents, recentPenaltyEvents, disputes, allLevels, allBadges }, options] = await Promise.all([
    getPointsPageData(),
    getOperationalCrudOptions(),
  ]);
  const topPerformer = leaderboard[0];

  return (
    <AdminPageShell
      eyebrow="M5 • HERO Points & Leveling"
      title="Leaderboard & Points Administration"
      description="Tampilan backend web untuk ranking poin, level karyawan, dan event poin terbaru yang mempengaruhi gamifikasi."
      badge={topPerformer ? `Top • ${topPerformer.name}` : undefined}
    >
      <AdminMetricGrid
        items={[
          { label: "Active leaderboard", value: `${leaderboard.length}`, meta: "Karyawan dengan skor aktif" },
          {
            label: "Top score",
            value: topPerformer ? `${topPerformer.totalPoints}` : "0",
            meta: "Poin tertinggi saat ini",
          },
          {
            label: "Point events",
            value: `${recentPointEvents.length}`,
            meta: "Transaksi poin terbaru",
          },
        ]}
      />

      <PointEventCrudForm employees={options.employees} categoryOptions={options.categoryOptions} />

      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="leaderboard">Site Leaderboard</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <AdminTableCard
            title="Site Leaderboard"
            description="Ranking poin yang dipakai admin untuk reward, badge, dan tracking performa."
            columns={["Employee", "Role", "Department", "Level", "Points"]}
            dateFilter={false}
            rows={leaderboard.map((row) => [
              row.name,
              row.role,
              row.department,
              row.levelName,
              `${row.totalPoints}`,
            ])}
          />
        </TabsContent>

        <TabsContent value="events">
          <AdminTableCard
            title="Recent Point Events"
            description="Event poin terakhir yang masuk ke sistem."
            columns={["Employee", "Category", "Label", "Points", "Date", "Action"]}
            dateFilter
            rows={recentPointEvents.map((row) => [
              row.employeeName,
              row.category,
              row.label,
              `${row.points > 0 ? "+" : ""}${row.points}`,
              row.createdAt.toLocaleDateString("id-ID"),
              <PointEventRowActions
                key={`${row.id}-actions`}
                row={row}
                employees={options.employees}
                categoryOptions={options.categoryOptions}
              />,
            ])}
          />
        </TabsContent>

        <TabsContent value="penalties" className="space-y-4">
          <PenaltyEventCrudForm employees={options.employees} />
          <AdminTableCard
            title="Penalty Events"
            description="Riwayat pemotongan poin untuk karyawan."
            columns={["Employee", "Penalty Code", "Deducted", "Date", "Dispute Status"]}
            dateFilter
            rows={recentPenaltyEvents.map((row) => [
              row.employeeName,
              row.penaltyCode,
              `-${row.pointsDeducted}`,
              row.createdAt.toLocaleDateString("id-ID"),
              row.isDisputed ? (
                 <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300">
                  Disputed
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  No Dispute
                </span>
              ),
            ])}
          />
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <AdminTableCard
            title="Dispute Queue"
            description="Daftar pengajuan keberatan penalti karyawan yang butuh review (Phase A)."
            columns={["Employee", "Penalty Code", "Deducted", "Reason", "Status", "Review"]}
            dateFilter
            rows={disputes.map((row) => [
              row.employeeName,
              row.penaltyCode,
              `${row.pointsDeducted}`,
              row.reason,
              row.status === "pending" ? (
                 <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  Pending
                </span>
              ) : row.status === "accepted" ? (
                 <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                  Accepted
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  Rejected
                </span>
              ),
              row.status === "pending" ? (
                 <DisputeReviewActions key={row.id} disputeId={row.id} />
              ) : (
                // Only show reviewer notes if already resolved
                <span className="text-sm text-foreground/75 truncate max-w-[200px] block">
                  {row.resolutionNotes || "-"}
                </span>
              )
            ])}
          />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <LevelConfigPanel levels={allLevels} />
          <BadgeConfigPanel badges={allBadges} />
        </TabsContent>
        
      </Tabs>
    </AdminPageShell>
  );
}
