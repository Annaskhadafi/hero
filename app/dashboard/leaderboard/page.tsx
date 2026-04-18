import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminTableCard } from "@/components/admin-table-card";
import { PointEventCrudForm, PointEventRowActions } from "@/components/operational-crud-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOperationalCrudOptions, getPointsPageData } from "@/lib/hero-admin";

export default async function LeaderboardPage() {
  const [{ leaderboard, recentPointEvents }, options] = await Promise.all([
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

      <PointEventCrudForm employees={options.employees} />

      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="leaderboard">Site Leaderboard</TabsTrigger>
          <TabsTrigger value="events">Recent Point Events</TabsTrigger>
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
              <PointEventRowActions key={`${row.id}-actions`} row={row} employees={options.employees} />,
            ])}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
