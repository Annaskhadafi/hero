import { db } from '../db';
import { employees } from '../db/schema/hero';
import { getApprovalCenterData } from '../lib/approval-workspace';
import { eq } from 'drizzle-orm';

async function main() {
  const [renaldo] = await db.select().from(employees).where(eq(employees.id, 991));
  const [ary] = await db.select().from(employees).where(eq(employees.id, 996));

  console.log('=== RENALDO (QC / Leader) ===');
  const dataR = await getApprovalCenterData(renaldo.email ?? '');
  console.log('Renaldo Inbox Groups:', dataR.inboxGroups.length);
  for (const g of dataR.inboxGroups) {
    for (const item of g.items) {
      console.log(`  - [${item.activityType}] ${item.title} (Level: ${item.level}, Step: ${item.currentStepLabel})`);
    }
  }

  console.log('=== ARY MAULANA (Repair SPV) ===');
  const dataA = await getApprovalCenterData(ary.email ?? '');
  console.log('Ary Maulana Inbox Groups:', dataA.inboxGroups.length);
  for (const g of dataA.inboxGroups) {
    for (const item of g.items) {
      console.log(`  - [${item.activityType}] ${item.title} (Level: ${item.level}, Step: ${item.currentStepLabel})`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
