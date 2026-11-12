import { WorkflowStudioOverview } from "@/components/workflow-studio-overview";
import { getWorkflowStudioConsoleData } from "@/lib/approval-blueprint";

export default async function WorkflowStudioPage() {
  const data = await getWorkflowStudioConsoleData();
  return <WorkflowStudioOverview data={data} />;
}
