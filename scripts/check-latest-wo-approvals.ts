import { db } from '../db'
import { approvals } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { desc, eq } from 'drizzle-orm'

async function run() {
  const latestApproved = await db.select().from(approvals).where(eq(approvals.status, 'approved')).orderBy(desc(approvals.reviewedAt)).limit(10)
  console.log('LATEST APPROVED STEPS:')
  for (const a of latestApproved) {
    console.log(`ID: ${a.id} | WO: ${a.repairFormWoId} | Level: ${a.level} | Name: ${a.approverName} | EmpId: ${a.approverEmployeeId} | ReviewedAt: ${a.reviewedAt?.toISOString()}`)
  }
  if (latestApproved.length > 0) {
    const woId = latestApproved[0].repairFormWoId
    if (woId) {
      const wo = await db.select().from(repairFormWo).where(eq(repairFormWo.id, woId)).limit(1).then(r => r[0])
      console.log(`\nWO #${woId}: ${wo?.noPengajuan} (${wo?.jenisPengajuan})`)
      const allApprs = await db.select().from(approvals).where(eq(approvals.repairFormWoId, woId)).orderBy(approvals.level)
      console.log('ALL STEPS:')
      for (const a of allApprs) {
        console.log(`  Level ${a.level} | Name: ${a.approverName} (Emp: ${a.approverEmployeeId}) | RouteSnapshot: ${a.routeSnapshot}`)
      }
    }
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })

