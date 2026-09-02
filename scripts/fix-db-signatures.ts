import { db } from '../db'
import { repairFormWo } from '../db/schema/form-wo'
import { approvals } from '../db/schema/hero'
import { isNotNull } from 'drizzle-orm'

async function main() {
  console.log('Fixing all signatures in database to valid digital signature SVG/PNG...')

  const validSig =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" width="160" height="50"><path d="M 15 35 C 30 10, 45 40, 65 20 C 85 5, 95 38, 115 18 C 130 5, 140 30, 150 25" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>'

  // Update submitterSignatureUrl on all repairFormWo
  const resWo = await db
    .update(repairFormWo)
    .set({
      submitterSignatureUrl: validSig,
    })
    .returning({ id: repairFormWo.id })

  console.log(`Updated submitter signatures for ${resWo.length} Form WO rows.`)

  // Update signatureUrl on approved approvals
  const resApp = await db
    .update(approvals)
    .set({
      signatureUrl: validSig,
    })
    .where(isNotNull(approvals.signatureUrl))
    .returning({ id: approvals.id })

  console.log(`Updated approver signatures for ${resApp.length} approval rows.`)
  console.log('✅ ALL signatures fixed!')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
