import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminTableCard } from "@/components/admin-table-card";
import { getPointsPageData } from "@/lib/hero-admin";

export default async function LeaderboardPage() {
  const { leaderboard, recentPointEvents } = await getPointsPageData();
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

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminTableCard
          title="Site Leaderboard"
          description="Ranking poin yang dipakai admin untuk reward, badge, dan tracking performa."
          columns={["Employee", "Role", "Department", "Level", "Points"]}
          rows={leaderboard.map((row) => [
            row.name,
            row.role,
            row.department,
            row.levelName,
            `${row.totalPoints}`,
          ])}
        />
        <AdminTableCard
          title="Recent Point Events"
          description="Event poin terakhir yang masuk ke sistem."
          columns={["Employee", "Category", "Label", "Points", "Date"]}
          rows={recentPointEvents.map((row) => [
            row.employeeName,
            row.category,
            row.label,
            `${row.points > 0 ? "+" : ""}${row.points}`,
            row.createdAt.toLocaleDateString("id-ID"),
          ])}
        />
      </div>
    </AdminPageShell>
  );
}
