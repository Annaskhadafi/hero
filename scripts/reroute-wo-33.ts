import { db } from '../db';
import { repairFormWo } from '../db/schema/form-wo';
import { approvals, employees } from '../db/schema/hero';
import { resolveApprovalRouteForActivity } from '../lib/approval-engine';
import { eq } from 'drizzle-orm';

async function main() {
  for (const targetId of [44, 45]) {
    const [wo] = await db.select().from(repairFormWo).where(eq(repairFormWo.id, targetId));
    if (!wo) continue;

    const isService = wo.jenisPengajuan === 'service';
    const transactionType = isService ? 'form_wo_service' : 'form_wo_repair_retread';

    const route = await resolveApprovalRouteForActivity({
      employeeId: 5,
      activityType: 'Form WO',
      priority: 'normal',
      overtimeMinutes: 0,
      transactionType,
      customerName: wo.customer || '',
      siteName: wo.site || '',
    });

    console.log(`WO #${targetId} Matrix:`, route.matrixName, 'ID:', route.matrixId);

    await db.delete(approvals).where(eq(approvals.repairFormWoId, targetId));

    for (const step of route.steps) {
      const isStep1 = step.stepOrder === 1;
      const stepStatus = isStep1 ? 'pending' : 'waiting';

      await db.insert(approvals).values({
        repairFormWoId: targetId,
        level: step.stepOrder,
        approverName: step.approverName,
        approverEmployeeId: step.approverEmployeeId,
        approverNodeId: step.approverNodeId,
        approvalMatrixId: route.matrixId ?? null,
        approvalStepId: step.approvalMatrixStepId ?? null,
        status: stepStatus,
        reviewedAt: null,
        signatureUrl: null,
        submittedAt: new Date(),
        resolutionSource: step.resolutionSource,
        routeSnapshot: JSON.stringify({
          label: step.label,
          nodeLabel: step.nodeLabel,
          fallbackLabel: step.fallbackLabel,
          escalationLabel: step.escalationLabel,
        }),
      });
    }

    console.log(`✅ WO #${targetId} approvals generated successfully!`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
