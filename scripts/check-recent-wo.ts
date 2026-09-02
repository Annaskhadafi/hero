import { db } from '../db';
import { repairFormWo } from '../db/schema/form-wo';
import { approvals, approvalMatrices, approvalMatrixSteps, employees, orgChartNodes } from '../db/schema/hero';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const allWos = await db
    .select({
      id: repairFormWo.id,
      noPengajuan: repairFormWo.noPengajuan,
      jenis: repairFormWo.jenisPengajuan,
      pemohon: repairFormWo.pemohon,
      customer: repairFormWo.customer,
      site: repairFormWo.site,
      status: repairFormWo.statusPengajuan,
    })
    .from(repairFormWo)
    .orderBy(desc(repairFormWo.id))

  console.log(`=== TOTAL WOs IN DB: ${allWos.length} ===`)
  console.table(allWos)

  console.log('\n=== ALL FORM WO MATRICES IN DB ===');
  const mats = await db
    .select()
    .from(approvalMatrices)
    .where(eq(approvalMatrices.activityType, 'Form WO'))
    .orderBy(desc(approvalMatrices.id));
  
  for (const m of mats) {
    console.log(`\nMatrix #${m.id}: name="${m.name}", siteId=${m.siteId}, type="${m.transactionType}", isActive=${m.isActive}`);
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
      .where(eq(approvalMatrixSteps.matrixId, m.id))
      .orderBy(approvalMatrixSteps.stepOrder);
    for (const s of steps) {
      console.log(`  Step ${s.stepOrder}: ${s.label} -> ${s.empName} (empId=${s.empId}, nodeId=${s.nodeId})`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
