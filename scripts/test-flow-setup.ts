import { db } from '../db';
import { approvalMatrices, approvalMatrixSteps, employees, apdRequests, approvals, masterSections, masterDepartments } from '../db/schema/hero';
import { apdSummaries, apdSummaryApprovals } from '../db/schema/apd-summary';
import { eq, and, desc, asc } from 'drizzle-orm';

async function main() {
  // 1. Cek Khadafi
  const [khadafi] = await db.select().from(employees).where(eq(employees.id, 5)).limit(1);
  console.log('=== KHADAFI ===');
  console.log('ID:', khadafi?.id, '| Name:', khadafi?.name, '| Email:', khadafi?.email, '| Section:', khadafi?.section, '| Role:', khadafi?.accessRole);

  // 2. Cek approval matrix APD
  const matrices = await db.select().from(approvalMatrices).where(eq(approvalMatrices.transactionType, 'apd-request-apd'));
  console.log('\n=== APD MATRICES ===');
  for (const m of matrices) {
    console.log(`ID:${m.id} | ${m.name} | Site:${m.siteId || 'ALL'} | Section:${m.sectionId || 'ALL'}`);
    const steps = await db.select().from(approvalMatrixSteps).where(eq(approvalMatrixSteps.approvalMatrixId, m.id)).orderBy(asc(approvalMatrixSteps.stepOrder));
    for (const s of steps) {
      console.log(`  Step ${s.stepOrder}: ${s.label} → ${s.approverRole} (emp:${s.approverEmployeeId || 'auto'})`);
    }
  }

  // 3. Cek recent APD requests
  const recentRequests = await db.select({
    id: apdRequests.id,
    requestNumber: apdRequests.requestNumber,
    employeeId: apdRequests.employeeId,
    siteId: apdRequests.siteId,
    status: apdRequests.status,
    requestCategory: apdRequests.requestCategory,
  }).from(apdRequests).orderBy(desc(apdRequests.id)).limit(5);
  console.log('\n=== RECENT APD REQUESTS ===');
  for (const r of recentRequests) {
    const emp = await db.select({ name: employees.name, email: employees.email, sectionId: employees.sectionId }).from(employees).where(eq(employees.id, r.employeeId)).limit(1);
    console.log(`#${r.id} | ${r.requestNumber} | Emp:${emp[0]?.name} (${emp[0]?.email}) | Section:${emp[0]?.sectionId} | Site:${r.siteId} | Status:${r.status} | Cat:${r.requestCategory}`);
  }

  // 4. Cek pending approvals
  const pendingApprovals = await db.select().from(approvals).where(eq(approvals.status, 'pending')).orderBy(desc(approvals.submittedAt)).limit(10);
  console.log('\n=== PENDING APPROVALS ===');
  for (const a of pendingApprovals) {
    console.log(`#${a.id} | Level:${a.level} | To:${a.approverName} (emp:${a.approverEmployeeId}) | APD:${a.apdRequestId} | Summary:${(a as any).apdSummaryId} | Status:${a.status}`);
  }

  // 5. Cek email config
  console.log('\n=== EMAIL NOTIFICATION CONFIG (check hero_admin for recipient) ===');
}

main().catch(console.error).finally(() => process.exit(0));
