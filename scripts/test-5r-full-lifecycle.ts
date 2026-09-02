import { db } from '../db'
import { fiveRReports, fiveRFindings } from '../db/schema/five-r'
import { approvals } from '../db/schema/hero'
import { eq, desc, and } from 'drizzle-orm'
import { initializeFiveRApprovals, resolveFiveRApprovalRoute } from '../lib/five-r-approval'
import { approveFiveRReportAction } from '../app/dashboard/quality/5r/actions'

async function main() {
  console.log('=== TEST FULL 5R APPROVAL WORKFLOW INTEGRATION ===\n')

  // Test Area: Balikpapan - Workshop Repair (Area 8) -> Expect Ary Maulana (ID: 996)
  const route = await resolveFiveRApprovalRoute({ areaId: 8, siteId: 126 })
  console.log('1. Route Resolved from Workflow Matrix:')
  route.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (ID: ${s.approverEmployeeId})`))

  if (route.steps.length !== 2) {
    throw new Error(`Expected 2 steps, got ${route.steps.length}`)
  }
  if (route.steps[0].approverEmployeeId !== 996) {
    throw new Error(`Step 1 approver should be Ary Maulana (996), got ${route.steps[0].approverEmployeeId}`)
  }
  if (route.steps[1].approverEmployeeId !== 944) {
    throw new Error(`Step 2 approver should be Bardinia Susi (944), got ${route.steps[1].approverEmployeeId}`)
  }
  console.log('   ✅ Matrix resolution verified!\n')

  // 2. Simulate Creating 5R Report
  const [report] = await db
    .insert(fiveRReports)
    .values({
      reportNumber: `5R-TEST-${Date.now()}`,
      masterAreaId: 8,
      picAreaName: 'Dedi Irawan',
      siteId: 126,
      auditorId: 1181,
      auditorName: 'Ria Annisa Putri',
      auditorEmail: 'ria.annisa@chitraparatama.co.id',
      auditPeriod: 'September',
      auditDate: '2026-09-02',
      reportType: 'ada_temuan',
      scoreRapi: 80,
      scoreRingkas: 80,
      scoreResik: 80,
      scoreRawat: 80,
      scoreRajin: 80,
      totalScore: '80.00',
      status: 'pending_approval',
      currentApprovalLevel: 1,
    })
    .returning()

  console.log(`2. Created Report: ${report.reportNumber} (ID: ${report.id})`)

  // Initialize Approvals
  await initializeFiveRApprovals(report)

  // Verify approvals table entries
  const appRows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.fiveRReportId, report.id))
    .orderBy(approvals.level)

  console.log(`3. Central Approvals table entries (${appRows.length} rows):`)
  appRows.forEach((r) => console.log(`   Level ${r.level}: Approver ID ${r.approverEmployeeId} (${r.approverName}), Status: ${r.status}`))

  if (appRows[0].status !== 'pending' || appRows[0].approverEmployeeId !== 996) {
    throw new Error('Step 1 not activated as pending for Ary Maulana')
  }
  if (appRows[1].status !== 'waiting' || appRows[1].approverEmployeeId !== 944) {
    throw new Error('Step 2 not waiting for Bardinia Susi')
  }
  console.log('   ✅ Central approvals table correctly seeded!\n')

  // 4. Simulate Step 1 Approval (Ary Maulana)
  console.log('4. Simulating Step 1 Approval by Ary Maulana...')
  const approve1Res = await approveFiveRReportAction(report.id, 'Disetujui area repair bersih dan rapi.')
  console.log('   Result:', approve1Res.message)

  const [afterStep1] = await db.select().from(fiveRReports).where(eq(fiveRReports.id, report.id))
  console.log(`   Report status: ${afterStep1.status}, Current Level: ${afterStep1.currentApprovalLevel}`)

  const appRowsAfter1 = await db
    .select()
    .from(approvals)
    .where(eq(approvals.fiveRReportId, report.id))
    .orderBy(approvals.level)

  console.log(`   Step 1 status: ${appRowsAfter1[0].status}, Step 2 status: ${appRowsAfter1[1].status}`)
  if (appRowsAfter1[0].status !== 'approved' || appRowsAfter1[1].status !== 'pending') {
    throw new Error('Workflow failed to advance to Step 2 pending')
  }
  console.log('   ✅ Successfully advanced to Step 2 (Bardinia Susi Ekawaty)!\n')

  // 5. Simulate Step 2 Final Approval (Bardinia Susi Ekawaty)
  console.log('5. Simulating Step 2 Final Approval by Bardinia Susi Ekawaty...')
  const approve2Res = await approveFiveRReportAction(report.id, 'Pengesahan CPI selesai.')
  console.log('   Result:', approve2Res.message)

  const [finalReport] = await db.select().from(fiveRReports).where(eq(fiveRReports.id, report.id))
  console.log(`   Final Report Status: ${finalReport.status}, Current Level: ${finalReport.currentApprovalLevel}`)

  const finalAppRows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.fiveRReportId, report.id))
    .orderBy(approvals.level)

  console.log(`   Step 1 status: ${finalAppRows[0].status}, Step 2 status: ${finalAppRows[1].status}`)
  if (finalReport.status !== 'approved' || finalAppRows[1].status !== 'approved') {
    throw new Error('Final approval failed')
  }
  console.log('   ✅ 100% End-to-End Approval Lifecycle Successful!\n')

  // Cleanup test report
  await db.delete(approvals).where(eq(approvals.fiveRReportId, report.id))
  await db.delete(fiveRReports).where(eq(fiveRReports.id, report.id))
  console.log('Cleaned up test data.')
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Lifecycle test failed:', err)
  process.exit(1)
})
