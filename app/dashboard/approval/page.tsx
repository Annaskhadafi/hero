import { ApprovalWorkbench } from "@/components/approval-workbench";
import { getServerSession } from "@/lib/auth-session";
import { getApprovalCenterData } from "@/lib/approval-workspace";

export default async function ApprovalPage() {
  const session = await getServerSession();
  const data = await getApprovalCenterData(session?.user?.email ?? "");
  return <ApprovalWorkbench data={data} />;
}
