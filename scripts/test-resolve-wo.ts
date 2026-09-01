import { db } from '../db';
import { resolveApprovalRouteForActivity } from '../lib/approval-engine';

async function main() {
  const route = await resolveApprovalRouteForActivity({
    employeeId: 5,
    activityType: 'Form WO',
    priority: 'normal',
    overtimeMinutes: 0,
    transactionType: 'form_wo_service_other',
    customerName: 'PT Berau Coal',
  });

  console.log('Resolved Matrix:', route.matrixName, 'Matrix ID:', route.matrixId);
  console.log('Resolved Steps:');
  for (const s of route.steps) {
    console.log(`  Step ${s.stepOrder}: ${s.label} -> ${s.approverName} (empId=${s.approverEmployeeId})`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
