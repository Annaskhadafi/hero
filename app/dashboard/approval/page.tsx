import { ApprovalWorkbench } from "@/components/approval-workbench";
import { getServerSession } from "@/lib/auth-session";
import { getApprovalCenterData } from "@/lib/approval-workspace";

export default async function ApprovalPage() {
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
      generalActivityCount: 0,
    },
    historyMetrics: {
      total: 0,
      approved: 0,
      rejected: 0,
      needsRevision: 0,
      inReview: 0,
    },
    inboxGroups: [],
    historyGroups: [],
    dailyActivityInboxItems: [],
    overtimeInboxItems: [],
    ptwInboxItems: [],
    contractReviewInboxItems: [],
    sopWinRequestInboxItems: [],
  };

  return <ApprovalWorkbench data={safeData} />;
}
