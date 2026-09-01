import { db } from '../db';
import { repairFormWo } from '../db/schema/form-wo';
import { approvals, approvalMatrices, approvalMatrixSteps, employees, orgChartNodes } from '../db/schema/hero';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const latestWos = await db
    .select()
    .from(repairFormWo)
    .orderBy(desc(repairFormWo.id))
    .limit(2);

  console.log('Latest WOs in DB:');
  for (const w of latestWos) {
    console.log(`WO #${w.id} (${w.noPengajuan}): jenis=${w.jenisPengajuan}, customer=${w.customer}, site=${w.site}, createdBy=${w.createdBy}`);
    const appvs = await db
      .select()
      .from(approvals)
      .where(eq(approvals.repairFormWoId, w.id));
    console.log('Approvals count:', appvs.length);
    for (const a of appvs) {
      console.log(`  Level ${a.level}: status=${a.status}, approver=${a.approverName} (empId=${a.approverEmployeeId}, matrixId=${a.approvalMatrixId})`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
