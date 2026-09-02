import { db } from '../db'
import { fiveRMasterAreas } from '../db/schema/five-r'
import { employees, sites } from '../db/schema/hero'
import { eq, sql } from 'drizzle-orm'

async function main() {
  const [areaTimika] = await db
    .select()
    .from(fiveRMasterAreas)
    .where(eq(fiveRMasterAreas.name, 'Timika – Revy'))
    .limit(1)

  console.log('Timika Master Area:', areaTimika)

  const timikaEmps = await db
    .select({
      id: employees.id,
      name: employees.name,
      jobTitle: employees.jobTitle,
      siteId: employees.siteId,
      departmentId: employees.departmentId,
      directManagerId: employees.directManagerId,
    })
    .from(employees)
    .where(
      sql`${employees.name} ILIKE '%Revy%' OR ${employees.jobTitle} ILIKE '%Timika%' OR ${employees.siteId} IN (SELECT id FROM hero_sites WHERE name ILIKE '%Timika%' OR name ILIKE '%Papua%')`
    )

  console.log('Employees matching Timika / Revy:', timikaEmps)

  const allSitesList = await db
    .select({ id: sites.id, name: sites.name, headEmployeeId: sites.headEmployeeId })
    .from(sites)
    .where(sql`${sites.name} ILIKE '%Timika%' OR ${sites.name} ILIKE '%Tanjung%' OR ${sites.name} ILIKE '%Papua%'`)

  console.log('Sites matching Timika/Tanjung:', allSitesList)
}

main().then(() => process.exit(0)).catch(console.error)
