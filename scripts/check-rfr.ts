import { db } from '../db'
import { hcRfrRequests, hcRfrApprovals } from '../db/schema/hero'
import { desc, eq } from 'drizzle-orm'

async function main() {
  const reqs = await db.select().from(hcRfrRequests).orderBy(desc(hcRfrRequests.id)).limit(5)
  console.log("RFR REQUESTS:")
  console.log(JSON.stringify(reqs, null, 2))

  for (const r of reqs) {
    const apps = await db.select().from(hcRfrApprovals).where(eq(hcRfrApprovals.rfrId, r.id)).orderBy(hcRfrApprovals.stepOrder)
    console.log(`APPROVALS FOR RFR ID ${r.id} (${r.rfrNumber}):`)
    console.log(JSON.stringify(apps, null, 2))
  }
}

main().catch(console.error).finally(() => process.exit(0))
