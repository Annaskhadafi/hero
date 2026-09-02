import { db } from '../db'
import { repairFormWo } from '../db/schema/form-wo'
import { approvals } from '../db/schema/hero'
import { isNotNull, eq } from 'drizzle-orm'

async function main() {
  console.log('Deleting all approvals for repairFormWo...')
  const deletedApprovals = await db
    .delete(approvals)
    .where(isNotNull(approvals.repairFormWoId))
    .returning({ id: approvals.id })
  console.log(`Deleted ${deletedApprovals.length} approval rows.`)

  console.log('Deleting all Form WO records...')
  const deletedWos = await db
    .delete(repairFormWo)
    .returning({ id: repairFormWo.id, noPengajuan: repairFormWo.noPengajuan })
  console.log(`Deleted ${deletedWos.length} Form WO records:`, deletedWos.map((w) => w.noPengajuan))

  console.log('✅ All test Form WO data has been cleaned up!')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
