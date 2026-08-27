import { db } from '../db'
import { approvals, employees } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { eq, desc } from 'drizzle-orm'

async function run() {
  const latestWo = await db
    .select()
    .from(repairFormWo)
    .orderBy(desc(repairFormWo.id))
    .limit(1)
    .then((r) => r[0])

  if (!latestWo) {
    console.log('No Form WO found')
    return
  }

  console.log(`Latest Form WO: #${latestWo.id} - ${latestWo.noPengajuan} (Status: ${latestWo.statusPengajuan})`)

  const apprs = await db
    .select()
    .from(approvals)
    .where(eq(approvals.repairFormWoId, latestWo.id))
    .orderBy(approvals.level)

  console.log('Approvals:')
  for (const a of apprs) {
    console.log(`  Level ${a.level} | ID: ${a.id} | Approver: ${a.approverName} (Emp: ${a.approverEmployeeId}) | Status: ${a.status} | ReviewedAt: ${a.reviewedAt?.toISOString() || '-'}`)
  }
}

run().catch(console.error)
