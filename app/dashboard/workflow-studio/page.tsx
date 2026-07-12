import { WorkflowStudioOverview } from "@/components/workflow-studio-overview";
import { ensureApprovalBlueprintSeedData, getWorkflowStudioConsoleData } from "@/lib/approval-blueprint";
import { ensureHeroSeedData } from "@/lib/hero-admin";

export default async function WorkflowStudioPage() {
  await ensureHeroSeedData();
  await ensureApprovalBlueprintSeedData();
  const data = await getWorkflowStudioConsoleData();
  return <WorkflowStudioOverview data={data} />;
}
