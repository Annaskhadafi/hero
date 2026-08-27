import { db } from '../db';
import { masterSections, masterDepartments, employees } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  // Check section 34 head
  const [sec] = await db.select().from(masterSections).where(eq(masterSections.id, 34)).limit(1);
  const secHead = sec?.headEmployeeId ? await db.select({ name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, sec.headEmployeeId)).limit(1) : null;
  console.log(`Section #34 (${sec?.name}): Head = ${secHead?.[0]?.name || 'NONE'} (${secHead?.[0]?.email || ''})`);

  // Check department
  if (sec?.departmentId) {
    const [dept] = await db.select().from(masterDepartments).where(eq(masterDepartments.id, sec.departmentId)).limit(1);
    const deptHead = dept?.headEmployeeId ? await db.select({ name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, dept.headEmployeeId)).limit(1) : null;
    console.log(`Department #${dept?.id} (${dept?.name}): Head = ${deptHead?.[0]?.name || 'NONE'} (${deptHead?.[0]?.email || ''})`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
