import { AdminPageShell } from "@/components/admin-page-shell";
import { getOperationalCrudOptions, getPointsAnalyticsPageData } from "@/lib/hero-admin";
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";
import { getRewardStoreData, getAdminRedemptionsList } from "@/app/actions/reward-store";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { LeaderboardClient } from "./leaderboard-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [data, options, role, rewardData, allRedemptions, menuPerm] = await Promise.all([
    getPointsAnalyticsPageData(),
    getOperationalCrudOptions(),
    getCurrentEmployeeAccessRole(),
    getRewardStoreData(),
    getAdminRedemptionsList(),
    getCurrentMenuPermission("reward_store"),
  ]);

  const { analytics, analyticsLeaderboard, disputes, allLevels, allBadges } = data;
  const topPerformer = analyticsLeaderboard[0];
  const isSuperAdmin = role === "Super Admin";
  const canManage = isSuperAdmin;
  const canReviewClaims = isSuperAdmin || menuPerm.canEdit || menuPerm.canSelectAll;

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
        siteOptions={options.sites}
        departmentOptions={options.departments}
        sectionOptions={options.sections}
        rewardData={rewardData}
        allRedemptions={allRedemptions}
        canManage={canManage}
        canReviewClaims={canReviewClaims}
      />
    </AdminPageShell>
  );
}
