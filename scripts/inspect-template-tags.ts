import { db } from '../db'
import { emailTemplates } from '../db/schema/hero'
import { sql } from 'drizzle-orm'

async function main() {
  const rows = await db
    .select({
      feature: emailTemplates.feature,
      origin: emailTemplates.origin,
      type: emailTemplates.templateType,
      count: sql`count(*)`,
    })
    .from(emailTemplates)
    .groupBy(emailTemplates.feature, emailTemplates.origin, emailTemplates.templateType)

  console.table(rows)

  // Sample templates from other core features like WO, Safety, Overtime, Leave
  const samples = await db
    .select({
      code: emailTemplates.templateCode,
      name: emailTemplates.name,
      feature: emailTemplates.feature,
      origin: emailTemplates.origin,
      type: emailTemplates.templateType,
    })
    .from(emailTemplates)
    .limit(15)

  console.table(samples)
}

main().then(() => process.exit(0)).catch(console.error)
