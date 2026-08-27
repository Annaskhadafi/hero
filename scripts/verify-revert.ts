import { db } from '../db';
import { sql } from 'drizzle-orm';
import { masterDepartments, orgNodeAssignments, employees } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const cfg = await db.select({ email: sql<string>`recipient_emails` }).from(sql`(SELECT recipient_emails FROM hero_apd_notification_config WHERE id = 1) as t`);
  
  const [dept] = await db.select().from(masterDepartments).where(eq(masterDepartments.id, 2)).limit(1);
  const deptHead = dept?.headEmployeeId ? await db.select({ name: employees.name }).from(employees).where(eq(employees.id, dept.headEmployeeId)).limit(1) : null;
  console.log('Dept Head Central Services:', deptHead?.[0]?.name || 'NONE');

  const assignments = await db.select().from(orgNodeAssignments).where(eq(orgNodeAssignments.employeeId, 5));
  console.log('Khadafi org assignments:', assignments.length > 0 ? assignments.map(a => a.nodeId).join(', ') : 'NONE (clean)');
}
main().catch(console.error).finally(() => process.exit(0));
