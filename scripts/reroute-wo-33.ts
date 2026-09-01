import { db } from '../db';
import { repairFormWo } from '../db/schema/form-wo';
import { approvals, employees } from '../db/schema/hero';
import { resolveApprovalRouteForActivity } from '../lib/approval-engine';
import { eq } from 'drizzle-orm';

async function main() {
  const [wo] = await db.select().from(repairFormWo).where(eq(repairFormWo.id, 33));
  if (!wo) {
    console.log('WO #33 not found');
    return;
  }

  const isService = wo.jenisPengajuan === 'service';
  const transactionType = isService ? 'form_wo_service_other' : 'form_wo_repair_retread';

  const route = await resolveApprovalRouteForActivity({
    employeeId: 5,
    activityType: 'Form WO',
    priority: 'normal',
    overtimeMinutes: 0,
    transactionType,
    customerName: wo.customer || '',
  });

  console.log('Matrix:', route.matrixName, 'ID:', route.matrixId);

  await db.delete(approvals).where(eq(approvals.repairFormWoId, 33));

  for (const step of route.steps) {
    const isStep1 = step.stepOrder === 1;
    const stepStatus = isStep1 ? 'pending' : 'waiting';

    await db.insert(approvals).values({
      repairFormWoId: 33,
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

  console.log('✅ WO #33 reset to Step 1 = pending!');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
