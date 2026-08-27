import { db } from '@/db';
import { approvals, apdRequests } from '@/db/schema/hero';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const pending = await db.select().from(approvals).where(eq(approvals.status, 'pending')).orderBy(desc(approvals.submittedAt)).limit(10);
  console.log('Pending approvals:', pending.length);
  for (const a of pending) {
    const src = a.apdRequestId ? 'APD' : a.activityId ? 'Activity' : 'Other';
    console.log(`  #${a.id} | ${src} (ID:${a.apdRequestId ?? a.activityId}) | Level:${a.level} | To: ${a.approverName} (emp:${a.approverEmployeeId}) | At: ${a.submittedAt?.toISOString()}`);
  }
  
  const recentApd = await db.select().from(apdRequests).orderBy(desc(apdRequests.createdAt)).limit(5);
  console.log('\nRecent APD requests:');
  for (const r of recentApd) {
    console.log(`  #${r.id} | ${r.requestNumber} | Cat: ${r.requestCategory} | Status: ${r.status} | Emp: ${r.employeeId}`);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
