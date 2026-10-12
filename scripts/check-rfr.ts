import { db } from '../db'
import { hcRfrRequests, hcRfrApprovals, emailDeliveryLogs } from '../db/schema/hero'
import { desc, eq, ilike } from 'drizzle-orm'

async function main() {
  const [rfr] = await db.select().from(hcRfrRequests).where(ilike(hcRfrRequests.rfrNumber, '%0019%')).limit(1)
  console.log("RFR 0019:")
  console.log(JSON.stringify(rfr, null, 2))

  if (rfr) {
    const apps = await db.select().from(hcRfrApprovals).where(eq(hcRfrApprovals.rfrId, rfr.id)).orderBy(hcRfrApprovals.stepOrder)
    console.log("APPROVALS:")
    console.log(JSON.stringify(apps, null, 2))
  }

  const logs = await db.select().from(emailDeliveryLogs).where(ilike(emailDeliveryLogs.subject, '%0019%')).orderBy(desc(emailDeliveryLogs.id)).limit(5)
  console.log("EMAIL LOGS FOR 0019:")
  console.log(JSON.stringify(logs, null, 2))

  const latest5Logs = await db.select().from(emailDeliveryLogs).orderBy(desc(emailDeliveryLogs.id)).limit(5)
  console.log("LATEST 5 EMAIL LOGS:")
  console.log(JSON.stringify(latest5Logs, null, 2))
}

main().catch(console.error).finally(() => process.exit(0))
