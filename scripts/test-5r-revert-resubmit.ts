import { db } from '../db'
import { approvals, fiveRApprovalLogs, fiveRFindings, fiveRReports } from '../db/schema/hero'
import { and, eq } from 'drizzle-orm'
import {
  approveFiveRReportAction,
  getFiveRReportDetailAction,
  revertFiveRReportAction,
  resubmitFiveRReportAction,
} from '../app/dashboard/quality/5r/actions'
import { initializeFiveRApprovals, resolveFiveRApprovalRoute } from '../lib/five-r-approval'

async function main() {
  console.log('=== TEST 5R REVERT & RESUBMIT DIRECT ROUTING ===\n')

  const testReportNumber = `5R-REV-TEST-${Date.now()}`
  const mockSignature1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const mockSignature2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  // 1. Insert report for Workshop Repair Balikpapan (Area ID: 8, Site ID: 126)
  const [created] = await db
    .insert(fiveRReports)
    .values({
      reportNumber: testReportNumber,
      masterAreaId: 8,
      picAreaName: 'Dedi Irawan',
      siteId: 126,
      auditorId: 1181,
      auditorName: 'Ria Annisa Putri',
      auditorEmail: 'ria.annisa@chitraparatama.co.id',
      auditPeriod: 'September',
      auditDate: '2026-09-02',
      reportType: 'ada_temuan',
      totalScore: '85.00',
      status: 'pending_approval',
      currentApprovalLevel: 1,
    })
    .returning()

  console.log(`1. Created Report: ${created.reportNumber} (ID: ${created.id})`)

  await initializeFiveRApprovals(created)

  // 2. Step 1 approves with signature
  console.log('2. Simulating Step 1 (PJO / Ary Maulana) Approval with signature...')
  const step1Res = await approveFiveRReportAction(created.id, 'Disetujui oleh PJO', mockSignature1)
  console.log('   Result:', step1Res.message)

  // Verify Step 1 is approved in DB
  const [appr1] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.fiveRReportId, created.id), eq(approvals.level, 1)))
  if (appr1.status !== 'approved' || !appr1.signatureUrl) {
    throw new Error('Step 1 signature or status was not saved properly!')
  }
  console.log('   ✅ Step 1 is approved and signature is saved!')

  // 3. Step 2 (Head of CPI) Reverts the report
  console.log('3. Simulating Step 2 (Head of CPI) REVERT (Minta Revisi)...')
  const revertRes = await revertFiveRReportAction(created.id, 'Foto temuan pilar Resik buram, mohon upload ulang.')
  console.log('   Result:', revertRes.message)

  // Verify after Revert:
  // a) Step 1 signature MUST STILL EXIST and status MUST STILL BE 'approved'
  const [appr1AfterRevert] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.fiveRReportId, created.id), eq(approvals.level, 1)))
  
  if (appr1AfterRevert.status !== 'approved') {
    throw new Error(`Step 1 status changed to ${appr1AfterRevert.status}! It should remain 'approved'.`)
  }
  if (!appr1AfterRevert.signatureUrl) {
    throw new Error('Step 1 signature was lost after revert!')
  }
  console.log('   ✅ VERIFIED: Step 1 signature and status remain 100% INTACT!')

  // b) Step 2 status is needs_revision
  const [appr2AfterRevert] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.fiveRReportId, created.id), eq(approvals.level, 2)))
  if (appr2AfterRevert.status !== 'needs_revision') {
    throw new Error(`Step 2 status should be 'needs_revision', got ${appr2AfterRevert.status}`)
  }
  console.log('   ✅ VERIFIED: Step 2 status is correctly marked as needs_revision!')

  // c) Report status is needs_revision and revertedFromLevel is 2
  const [repAfterRevert] = await db
    .select()
    .from(fiveRReports)
    .where(eq(fiveRReports.id, created.id))
  if (repAfterRevert.status !== 'needs_revision' || repAfterRevert.revertedFromLevel !== 2) {
    throw new Error(`Report status/revertedFromLevel incorrect: status=${repAfterRevert.status}, level=${repAfterRevert.revertedFromLevel}`)
  }
  console.log('   ✅ VERIFIED: Report recorded revertedFromLevel = 2!')

  // 4. Submitter revises and resubmits
  console.log('4. Simulating Submitter Resubmitting the Revised Report...')
  const resubmitRes = await resubmitFiveRReportAction(created.id, 'Foto temuan pilar Resik telah diperjelas.')
  console.log('   Result:', resubmitRes.message)

  // Verify after Resubmit:
  // a) Report currentApprovalLevel MUST BE 2 (LANGSUNG KE TAHAP YANG MEMBERI REVISI)!
  const [repAfterResubmit] = await db
    .select()
    .from(fiveRReports)
    .where(eq(fiveRReports.id, created.id))
  
  if (repAfterResubmit.currentApprovalLevel !== 2) {
    throw new Error(`Report should jump directly to Level 2, but is at Level ${repAfterResubmit.currentApprovalLevel}`)
  }
  if (repAfterResubmit.status !== 'pending_approval') {
    throw new Error(`Report status should be 'pending_approval', got ${repAfterResubmit.status}`)
  }
  console.log('   ✅ VERIFIED: Report jumped DIRECTLY to Level 2 (revising approver)!')

  // b) Step 1 is STILL approved with signature
  const [appr1AfterResubmit] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.fiveRReportId, created.id), eq(approvals.level, 1)))
  if (appr1AfterResubmit.status !== 'approved' || !appr1AfterResubmit.signatureUrl) {
    throw new Error('Step 1 signature was lost after resubmit!')
  }
  console.log('   ✅ VERIFIED: Step 1 signature still preserved!')

  // c) Step 2 is now pending
  const [appr2AfterResubmit] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.fiveRReportId, created.id), eq(approvals.level, 2)))
  if (appr2AfterResubmit.status !== 'pending') {
    throw new Error(`Step 2 status should be 'pending', got ${appr2AfterResubmit.status}`)
  }
  console.log('   ✅ VERIFIED: Step 2 is now active/pending for final review!')

  // 5. Step 2 approves
  console.log('5. Simulating Step 2 (Head of CPI) FINAL APPROVAL...')
  const finalApproveRes = await approveFiveRReportAction(created.id, 'Hasil revisi sangat baik, disetujui final.', mockSignature2)
  console.log('   Result:', finalApproveRes.message)

  const [finalReport] = await db
    .select()
    .from(fiveRReports)
    .where(eq(fiveRReports.id, created.id))
  if (finalReport.status !== 'approved') {
    throw new Error(`Final report status should be 'approved', got ${finalReport.status}`)
  }
  console.log('   ✅ VERIFIED: Final report status is APPROVED!')

  // Clean up test data
  await db.delete(approvals).where(eq(approvals.fiveRReportId, created.id))
  await db.delete(fiveRApprovalLogs).where(eq(fiveRApprovalLogs.reportId, created.id))
  await db.delete(fiveRReports).where(eq(fiveRReports.id, created.id))
  console.log('\n🎉 ALL REVERT & RESUBMIT CHECKS PASSED 100% PERFECTLY!')
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})
