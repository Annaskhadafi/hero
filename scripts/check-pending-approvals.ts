import { db } from '../db';
import { approvals, employees } from '../db/schema/hero';
import { eq, desc } from 'drizzle-orm';
async function main() {
  const pending = await db.select().from(approvals).where(eq(approvals.status, 'pending')).orderBy(desc(approvals.id)).limit(10);
  console.log('Pending approvals:', pending.length);
  for (const a of pending) {
    const emp = a.approverEmployeeId ? await db.select({ name: employees.name }).from(employees).where(eq(employees.id, a.approverEmployeeId)).limit(1) : null;
    console.log(`#${a.id} | Level:${a.level} | To:${emp?.[0]?.name || a.approverName} (emp:${a.approverEmployeeId}) | APD:${a.apdRequestId} | Summary:${(a as any).apd_summary_id} | ActType:${a.activityId ? 'activity' : 'other'}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
