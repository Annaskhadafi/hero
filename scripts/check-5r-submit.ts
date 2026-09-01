import { db } from '../db';
import { fiveRReports, fiveRMasterAreas } from '../db/schema/five-r';
import { approvals, approvalMatrices, approvalMatrixSteps, employees, orgChartNodes } from '../db/schema/hero';
import { desc, eq } from 'drizzle-orm';

async function main() {
  console.log('--- LATEST 5R REPORTS ---');
  const reports = await db
    .select({
      id: fiveRReports.id,
      reportNumber: fiveRReports.reportNumber,
      auditorId: fiveRReports.auditorId,
      auditorName: fiveRReports.auditorName,
      masterAreaId: fiveRReports.masterAreaId,
      picAreaName: fiveRReports.picAreaName,
      status: fiveRReports.status,
      currentApprovalLevel: fiveRReports.currentApprovalLevel,
      createdAt: fiveRReports.createdAt,
    })
    .from(fiveRReports)
    .orderBy(desc(fiveRReports.createdAt))
    .limit(5);

  console.log('Reports:', JSON.stringify(reports, null, 2));

  if (reports.length > 0) {
    const latestReport = reports[0];
    console.log(`\n--- APPROVALS FOR REPORT #${latestReport.id} (${latestReport.reportNumber}) ---`);
    const appvs = await db
      .select({
        id: approvals.id,
        level: approvals.level,
        status: approvals.status,
        approverName: approvals.approverName,
        approverEmployeeId: approvals.approverEmployeeId,
        submittedAt: approvals.submittedAt,
        routeSnapshot: approvals.routeSnapshot,
      })
      .from(approvals)
      .where(eq(approvals.fiveRReportId, latestReport.id));

    console.log('Approvals:', JSON.stringify(appvs, null, 2));
  }

  console.log('\n--- CURRENT 5R MATRICES IN DB ---');
  const mats = await db
    .select({
      id: approvalMatrices.id,
      name: approvalMatrices.name,
      transactionType: approvalMatrices.transactionType,
      siteId: approvalMatrices.siteId,
      sectionId: approvalMatrices.sectionId,
      isActive: approvalMatrices.isActive,
    })
    .from(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'five_r_report'));

  console.log('Matrices count:', mats.length);
  for (const m of mats.slice(0, 5)) {
    console.log(`Matrix #${m.id}: site=${m.siteId}, section=${m.sectionId}`);
    const steps = await db
      .select({
        stepOrder: approvalMatrixSteps.stepOrder,
        label: approvalMatrixSteps.label,
        nodeId: approvalMatrixSteps.nodeId,
        empId: orgChartNodes.employeeId,
        empName: employees.name,
      })
      .from(approvalMatrixSteps)
      .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .where(eq(approvalMatrixSteps.matrixId, m.id));
    console.log('  Steps:', steps);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
