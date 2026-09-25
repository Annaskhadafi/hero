import { AdminPageShell } from "@/components/admin-page-shell";
import { getOperationalCrudOptions, getPointsAnalyticsPageData } from "@/lib/hero-admin";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";
import { LeaderboardClient } from "./leaderboard-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [data, options, role] = await Promise.all([
    getPointsAnalyticsPageData(),
    getOperationalCrudOptions(),
    getCurrentEmployeeAccessRole(),
  ]);

  const { analytics, analyticsLeaderboard, disputes, allLevels, allBadges } = data;
  const topPerformer = analyticsLeaderboard[0];
  const canManage = role === "Super Admin" || role === "HC Manager";

  const safeTimeline = analytics.unifiedTimeline.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  const safeDisputes = disputes.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <AdminPageShell
      eyebrow="Sistem Gamifikasi & Performa"
      title="Papan Peringkat & Rekognisi Karyawan"
      description="Pantau podium juara, perolehan skor kinerja, lencana pencapaian, dan riwayat kedisiplinan tim operasional secara terpusat."
      badge={topPerformer ? `Juara 1 • ${topPerformer.name}` : undefined}
    >
      <LeaderboardClient
        initialLeaderboard={analyticsLeaderboard}
        analytics={{
          ...analytics,
          unifiedTimeline: safeTimeline,
        }}
        disputes={safeDisputes}
        allLevels={allLevels}
        allBadges={allBadges}
        employeeOptions={options.employees}
        canManage={canManage}
      />
    </AdminPageShell>
  );
}
