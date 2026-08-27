import { db } from '@/db';
import { approvals, apdRequests, employees } from '@/db/schema/hero';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const tinis = await db.select({ id: employees.id, name: employees.name, email: employees.email }).from(employees).where(eq(employees.name, 'Tini Dwi Saripah'));
  console.log('Tini Dwi Saripah:', JSON.stringify(tinis));
  
  if (tinis.length > 0) {
    const approvalsToTini = await db.select().from(approvals).where(eq(approvals.approverEmployeeId, tinis[0].id)).orderBy(desc(approvals.submittedAt)).limit(5);
    console.log('\nApprovals to Tini:', approvalsToTini.length);
    for (const a of approvalsToTini) {
      console.log(`\n--- Approval #${a.id} ---`);
      console.log(`  APD Request: ${a.apdRequestId} | Level: ${a.level} | Status: ${a.status}`);
      console.log(`  Source: ${a.resolutionSource}`);
      if (a.apdRequestId) {
        const [apd] = await db.select().from(apdRequests).where(eq(apdRequests.id, a.apdRequestId!)).limit(1);
        if (apd) {
          console.log(`  Request: ${apd.requestNumber} | Cat: ${apd.requestCategory} | SiteId: ${apd.siteId}`);
          const [reqEmp] = await db.select({ name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, apd.employeeId)).limit(1);
          console.log(`  Requester: ${reqEmp?.name} (${reqEmp?.email})`);
        }
      }
      // Check routeSnapshot
      if (a.routeSnapshot) {
        try {
          const route = JSON.parse(a.routeSnapshot);
          console.log(`  Route steps:`);
          for (const step of route.steps || []) {
            console.log(`    Step ${step.stepOrder}: ${step.label} → ${step.approverName} (emp:${step.approverEmployeeId}) [${step.resolutionSource}]`);
          }
        } catch {}
      }
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
