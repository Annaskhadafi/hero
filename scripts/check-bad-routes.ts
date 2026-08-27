import { db } from '@/db';
import { approvals, apdRequests, employees } from '@/db/schema/hero';
import { eq, desc } from 'drizzle-orm';

async function main() {
  // Find all pending APD approvals
  const pending = await db.select().from(approvals)
    .where(eq(approvals.status, 'pending'))
    .orderBy(desc(approvals.submittedAt));

  console.log('Pending APD approvals:', pending.length);
  
  for (const a of pending) {
    if (!a.apdRequestId) continue;
    
    const [apd] = await db.select().from(apdRequests).where(eq(apdRequests.id, a.apdRequestId!)).limit(1);
    if (!apd) continue;
    
    const [approver] = await db.select({ name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, a.approverEmployeeId!)).limit(1);
    
    let routeSteps = '';
    if (a.routeSnapshot) {
      try {
        const route = JSON.parse(a.routeSnapshot);
        routeSteps = (route.steps || []).map((s: any) => `Step ${s.stepOrder}: ${s.label} → ${s.approverName} [${s.resolutionSource}]`).join(' | ');
      } catch {}
    }
    
    console.log(`\n--- Approval #${a.id} ---`);
    console.log(`  Request: ${apd.requestNumber} | Cat: ${apd.requestCategory} | Site: ${apd.siteId}`);
    console.log(`  Approver: ${approver?.name} (${approver?.email})`);
    console.log(`  Level: ${a.level} | Source: ${a.resolutionSource}`);
    console.log(`  Route: ${routeSteps}`);
    
    // Check if this is a bad route (more than 1 step for APD)
    if (a.level === 1 && routeSteps.includes('Step 2')) {
      console.log(`  ⚠️ BAD ROUTE: APD should be single-step but has multiple steps!`);
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
