import { db } from '../db';
import { employees } from '../db/schema/hero';
import { getApprovalCenterData } from '../lib/approval-workspace';
import { eq } from 'drizzle-orm';

async function main() {
  const [emp] = await db.select().from(employees).where(eq(employees.id, 5));
  console.log('Testing for user:', emp.name, `(${emp.email})`);

  const data = await getApprovalCenterData(emp.email ?? '');
  console.log('Total Pending in Inbox:', data.summary.pendingCount);
  console.log('Pending Items:');
  for (const item of data.items) {
    console.log(`- [${item.activityType}] ${item.title} (Status: ${item.status}, Route: ${item.approvalLabel})`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
