import { ApprovalWorkbench } from "@/components/approval-workbench";
import { getServerSession } from "@/lib/auth-session";
import { getApprovalCenterData } from "@/lib/approval-workspace";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Central Approval Inbox Page
export default async function ApprovalPage() {
  const access = await getCurrentMenuPermission("approval_inbox");
  if (!access.canView) {
    redirect("/dashboard");
  }

  const session = await getServerSession();
  const email = session?.user?.email || "chitra.operation.hero@gmail.com";
  let data = null;
  try {
    data = await getApprovalCenterData(email);
  } catch (err) {
    console.error("[ApprovalPage] Server-side exception:", err);
  }

  const safeData = data ?? {
    currentUserName: email || "User",
    inboxMetrics: {
      pendingGroups: 0,
      pendingActivities: 0,
      dueSoon: 0,
      overdue: 0,
      dailyActivityCount: 0,
      overtimeCount: 0,
      ptwCount: 0,
      sopWinRequestCount: 0,
      contractReviewCount: 0,
      rfrCount: 0,
      generalActivityCount: 0,
    },
    historyMetrics: {
      total: 0,
      approved: 0,
      rejected: 0,
      needsRevision: 0,
      inReview: 0,
    },
    historyGroups: [],
    inboxGroups: [],
    dailyActivityInboxItems: (data as any)?.dailyActivityInboxItems || [],
    overtimeInboxItems: (data as any)?.overtimeInboxItems || [],
    ptwInboxItems: (data as any)?.ptwInboxItems || [],
    contractReviewInboxItems: (data as any)?.contractReviewInboxItems || [],
    sopWinRequestInboxItems: (data as any)?.sopWinRequestInboxItems || [],
    rfrInboxItems: (data as any)?.rfrInboxItems || [],
  };

  return <ApprovalWorkbench data={safeData} />;
}
