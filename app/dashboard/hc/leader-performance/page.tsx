import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { db } from "@/db";
import { employees as dbEmployees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import {
  getLeaderPerformanceReviews,
  getLeaderPerformanceStats,
  getLeadersForReviewer,
  getActiveEmployees,
} from "@/app/actions/leader-performance";
import { LeaderPerformanceClientPage } from "./client-page";

export const metadata = {
  title: "Leader Performance - HC",
};

export default async function LeaderPerformancePage() {
  const access = await getCurrentMenuPermission("hc_leader_performance");
  if (!access.canView) {
    redirect("/dashboard");
  }

  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const [reviews, stats, allowedLeaders, employees, reviewerEmp] = await Promise.all([
    getLeaderPerformanceReviews(),
    getLeaderPerformanceStats(),
    getLeadersForReviewer(session.user.email),
    getActiveEmployees(),
    db
      .select({ accessRole: dbEmployees.accessRole })
      .from(dbEmployees)
      .where(eq(dbEmployees.email, session.user.email))
      .limit(1)
      .then((rows) => rows[0] || null),
  ]);

  const isReviewerAdminOrManager =
    reviewerEmp?.accessRole === "Super Admin" ||
    reviewerEmp?.accessRole === "HC Manager";

  return (
    <LeaderPerformanceClientPage
      initialReviews={reviews}
      initialStats={stats}
      allowedLeaders={allowedLeaders}
      employees={employees}
      currentUserEmail={session.user.email}
      isReviewerAdminOrManager={isReviewerAdminOrManager}
    />
  );
}
