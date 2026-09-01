import { db } from '../db';
import { employees } from '../db/schema/hero';
import { getApprovalCenterData } from '../lib/approval-workspace';
import { eq } from 'drizzle-orm';

async function main() {
  const [emp] = await db.select().from(employees).where(eq(employees.id, 5));
  console.log('Testing for user:', emp.name, `(${emp.email})`);

  const data = await getApprovalCenterData(emp.email ?? '');
  console.log('Inbox Groups Count:', data.inboxGroups.length);
  for (const g of data.inboxGroups) {
    console.log(`Group: ${g.workDateLabel} (${g.items.length} items)`);
    for (const item of g.items) {
      console.log(`  - [${item.activityType}] ${item.title} (Level: ${item.level}, Status: ${item.status})`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
