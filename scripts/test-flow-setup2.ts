import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps, employees, apdRequests, approvals } from '../db/schema/hero';
import { eq, desc, asc } from 'drizzle-orm';

async function main() {
  // 1. Khadafi
  const [k] = await db.select().from(employees).where(eq(employees.id, 5)).limit(1);
  console.log('KHADAFI:', k?.name, '| Email:', k?.email, '| Role:', k?.accessRole);

  // 2. Pending approvals
  const pa = await db.select().from(approvals).where(eq(approvals.status, 'pending')).orderBy(desc(approvals.submittedAt)).limit(10);
  console.log('\nPENDING APPROVALS:', pa.length);
  for (const a of pa) {
    const emp = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, a.approverEmployeeId || 0)).limit(1);
    console.log(`  #${a.id} Level:${a.level} To:${emp[0]?.name || a.approverName} APD:${a.apdRequestId} Summary:${(a as any).apd_summary_id}`);
  }

  // 3. Recent APD
  const ra = await db.select().from(apdRequests).orderBy(desc(apdRequests.id)).limit(3);
  console.log('\nRECENT APD:');
  for (const r of ra) {
    const emp = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, r.employeeId)).limit(1);
    console.log(`  #${r.id} ${r.requestNumber} by ${emp[0]?.name} Status:${r.status}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
