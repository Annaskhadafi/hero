import { db } from '../db';
import { apdSummaryApprovals, apdSummaries } from '../db/schema/apd-summary';
import { employees, masterSections, masterDepartments } from '../db/schema/hero';
import { eq, and } from 'drizzle-orm';

async function main() {
  // 1. Set Khadafi as section head for section 23 (Marketing & Corporate Comm)
  await db.update(masterSections).set({ headEmployeeId: 5 }).where(eq(masterSections.id, 23));
  console.log('Set Khadafi (emp 5) as Section Head of section 23');

  // 2. Set Khadafi as dept head for dept 2 (Finance Business Partner)
  await db.update(masterDepartments).set({ headEmployeeId: 5 }).where(eq(masterDepartments.id, 2));
  console.log('Set Khadafi (emp 5) as Dept Head of dept 2');

  // 3. Update existing summary approvals for summary 5
  await db.update(apdSummaryApprovals)
    .set({ approverEmployeeId: 5 })
    .where(and(eq(apdSummaryApprovals.summaryId, 5), eq(apdSummaryApprovals.level, 1)));
  console.log('Updated summary 5 level 1 approver to Khadafi');

  await db.update(apdSummaryApprovals)
    .set({ approverEmployeeId: 5 })
    .where(and(eq(apdSummaryApprovals.summaryId, 5), eq(apdSummaryApprovals.level, 2)));
  console.log('Updated summary 5 level 2 approver to Khadafi');

  // 4. Also update hero_approvals
  const { approvals } = await import('../db/schema/hero');
  await db.update(approvals)
    .set({ approverEmployeeId: 5, approverName: 'Mochamad Annas Khadafi' })
    .where(and(eq(approvals.apdSummaryId, 5)));
  console.log('Updated hero_approvals for summary 5');

  // 5. Check Khadafi email
  const [emp] = await db.select({ id: employees.id, name: employees.name, email: employees.email })
    .from(employees).where(eq(employees.id, 5));
  console.log('Khadafi:', emp);

  // 6. Verify summary 5 status
  const [summary] = await db.select({ id: apdSummaries.id, status: apdSummaries.status })
    .from(apdSummaries).where(eq(apdSummaries.id, 5));
  console.log('Summary 5 status:', summary?.status);

  console.log('\nDone! Semua approval summary 5 diarahkan ke Khadafi.');
}
main().then(() => process.exit(0));
