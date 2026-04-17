import { ApprovalWorkbench } from "@/components/approval-workbench";
import { getApprovalWorkbenchData } from "@/lib/approval-workspace";

export default async function ApprovalPage() {
  const data = await getApprovalWorkbenchData();
  return <ApprovalWorkbench data={data} />;
}
