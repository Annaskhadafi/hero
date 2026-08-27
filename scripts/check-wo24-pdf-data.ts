import { db } from '../db'
import { approvals } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { eq } from 'drizzle-orm'

async function run() {
  const wo = await db
    .select()
    .from(repairFormWo)
    .where(eq(repairFormWo.noPengajuan, 'FRMWO/26/08/0024'))
    .limit(1)
    .then((r) => r[0])

  console.log('Form WO:', {
    id: wo?.id,
    noPengajuan: wo?.noPengajuan,
    customer: wo?.customer,
    site: wo?.site,
    pemohon: wo?.pemohon,
    submitterSignatureUrl: wo?.submitterSignatureUrl ? `${wo.submitterSignatureUrl.substring(0, 30)}...` : null,
    items: wo?.items,
  })

  const apprs = await db
    .select()
    .from(approvals)
    .where(eq(approvals.repairFormWoId, wo!.id))
    .orderBy(approvals.level)

  console.log('Approvals:')
  for (const a of apprs) {
    console.log(`Level ${a.level} | ID: ${a.id} | Approver: ${a.approverName} | Status: ${a.status} | SignatureUrl: ${a.signatureUrl ? `${a.signatureUrl.substring(0, 30)}... (length ${a.signatureUrl.length})` : 'NULL'} | RouteSnapshot: ${a.routeSnapshot ? 'YES' : 'NO'}`)
  }
}

run().catch(console.error)
