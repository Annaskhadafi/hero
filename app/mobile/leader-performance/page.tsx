import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { employees as dbEmployees } from "@/db/schema/hero";
import { eq, sql } from "drizzle-orm";
import {
  getLeaderPerformanceReviews,
  getLeaderPerformanceStats,
  getLeadersForReviewer,
  getActiveEmployees,
} from "@/app/actions/leader-performance";
import { MobileLeaderPerformanceClientPage } from "./client-page";

export const metadata = {
  title: "Leader Performance Survey - Mobile",
};

export default async function MobileLeaderPerformancePage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const [reviews, stats, allowedLeaders, employees, reviewerEmp] = await Promise.all([
    getLeaderPerformanceReviews(),
    getLeaderPerformanceStats(),
    getLeadersForReviewer(session.user.email, true),
    getActiveEmployees(),
    db
      .select({ 
        id: dbEmployees.employeeSn, 
        fullName: dbEmployees.name, 
        accessRole: dbEmployees.accessRole 
      })
      .from(dbEmployees)
      .where(eq(sql`lower(${dbEmployees.email})`, session.user.email.toLowerCase()))
      .limit(1)
      .then((rows) => rows[0] || null),
  ]);

  const isReviewerAdminOrManager =
    reviewerEmp?.accessRole === "Super Admin" ||
    reviewerEmp?.accessRole === "HC Manager";

  // Filter reviews to show only the ones reviewed by the current user (or all if Admin/Manager)
  const myReviews = isReviewerAdminOrManager
    ? reviews
    : reviews.filter((r) => r.reviewerEmail === session.user.email);

  return (
    <MobileLeaderPerformanceClientPage
      initialReviews={myReviews}
      initialStats={stats}
      allowedLeaders={allowedLeaders}
      employees={employees}
      currentUserEmail={session.user.email}
      currentReviewerId={reviewerEmp?.id || null}
      currentReviewerName={reviewerEmp?.fullName || "User"}
      isReviewerAdminOrManager={isReviewerAdminOrManager}
    />
  );
}
