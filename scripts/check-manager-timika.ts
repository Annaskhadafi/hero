import { db } from '../db'
import { employees, sites } from '../db/schema/hero'
import { eq, sql } from 'drizzle-orm'

async function main() {
  const [manager] = await db.select().from(employees).where(eq(employees.id, 1094))
  console.log('Revy direct manager (1094):', manager)

  const sitesAll = await db.select().from(sites)
  console.log('All sites in database:', sitesAll.map(s => `${s.id}: ${s.name} (Head: ${s.headEmployeeId})`))

  const techLeaders = await db
    .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle, siteId: employees.siteId })
    .from(employees)
    .where(sql`${employees.jobTitle} ILIKE '%leader%' OR ${employees.jobTitle} ILIKE '%spv%' OR ${employees.jobTitle} ILIKE '%head%'`)

  console.log('Leaders/SPV in DB:', techLeaders)
}

main().then(() => process.exit(0)).catch(console.error)
