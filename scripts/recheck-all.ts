import { db } from '../db';
import { approvals, apdRequests, emailDeliveryLogs, employees, approvalMatrices, approvalMatrixSteps, masterSections } from '../db/schema/hero';
import { eq, desc, and, sql } from 'drizzle-orm';

async function main() {
  console.log('=== RECHECK APD/MATERIAL/TOOLS APPROVAL SYSTEM ===\n');

  // 1. Check approval routing
  console.log('1. APPROVAL ROUTING');
  console.log('─'.repeat(50));
  
  const pendingApprovals = await db.select({
    id: approvals.id,
    apdRequestId: approvals.apdRequestId,
    level: approvals.level,
    approverName: approvals.approverName,
    status: approvals.status,
    resolutionSource: approvals.resolutionSource,
  }).from(approvals)
    .where(eq(approvals.status, 'pending'))
    .orderBy(desc(approvals.id));

  console.log(`Pending approvals: ${pendingApprovals.length}`);
  for (const a of pendingApprovals) {
    const [req] = await db.select({
      requestNumber: apdRequests.requestNumber,
      requestCategory: apdRequests.requestCategory,
      siteId: apdRequests.siteId,
    }).from(apdRequests).where(eq(apdRequests.id, a.apdRequestId ?? 0)).limit(1);
    
    console.log(`  #${a.id} | ${req?.requestNumber} | ${req?.requestCategory} | Level ${a.level} → ${a.approverName} | ${a.resolutionSource}`);
  }

  // 2. Check email delivery log
  console.log('\n2. EMAIL DELIVERY LOG (last 20)');
  console.log('─'.repeat(50));
  
  const emails = await db.select().from(emailDeliveryLogs)
    .orderBy(desc(emailDeliveryLogs.sentAt))
    .limit(20);

  const apdEmails = emails.filter(e => 
    e.templateCode?.includes('apd_request') || 
    e.subject?.includes('APD') || 
    e.subject?.includes('MATERIAL') || 
    e.subject?.includes('TOOLS')
  );

  console.log(`Total emails: ${emails.length} | APD/Material/Tools emails: ${apdEmails.length}`);
  for (const e of apdEmails) {
    console.log(`  ✅ ${e.toEmail} | ${e.templateCode} | ${e.subject?.substring(0, 60)}`);
  }

  // 3. Check matrices
  console.log('\n3. APPROVAL MATRICES');
  console.log('─'.repeat(50));
  
  const matrices = await db.select({
    id: approvalMatrices.id,
    transactionType: approvalMatrices.transactionType,
    siteId: approvalMatrices.siteId,
    isActive: approvalMatrices.isActive,
  }).from(approvalMatrices)
    .where(eq(approvalMatrices.isActive, true))
    .orderBy(approvalMatrices.transactionType);

  const apdMatrices = matrices.filter(m => m.transactionType?.startsWith('apd-request'));
  console.log(`Active APD/Material/Tools matrices: ${apdMatrices.length}`);
  
  for (const m of apdMatrices) {
    const steps = await db.select().from(approvalMatrixSteps)
      .where(eq(approvalMatrixSteps.matrixId, m.id));
    
    const [site] = await db.select({ name: sql<string>`(SELECT name FROM hero_sites WHERE id = ${m.siteId})` }).from(approvalMatrices).limit(1);
    
    console.log(`  Matrix #${m.id} | ${m.transactionType} | Site: ${site?.name || m.siteId} | Steps: ${steps.length}`);
  }

  // 4. Check head sections
  console.log('\n4. MASTER SECTIONS (headEmployeeId)');
  console.log('─'.repeat(50));
  
  const sections = await db.select().from(masterSections)
    .where(sql`${masterSections.headEmployeeId} IS NOT NULL`)
    .limit(10);

  console.log(`Sections with head: ${sections.length}`);
  for (const s of sections) {
    const [head] = await db.select({ name: employees.name })
      .from(employees).where(eq(employees.id, s.headEmployeeId ?? 0)).limit(1);
    console.log(`  Section #${s.id} | Head: ${head?.name || 'N/A'}`);
  }

  console.log('\n=== RECHECK COMPLETE ===');
}

main().catch(console.error);
