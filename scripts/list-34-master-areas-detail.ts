import { db } from '../db'
import { fiveRMasterAreas } from '../db/schema/five-r'
import { sites, employees } from '../db/schema/hero'
import { eq, asc } from 'drizzle-orm'

async function main() {
  const areas = await db
    .select({
      id: fiveRMasterAreas.id,
      name: fiveRMasterAreas.name,
      siteId: fiveRMasterAreas.siteId,
      siteName: sites.name,
      siteHeadEmployeeId: sites.headEmployeeId,
      picEmployeeId: fiveRMasterAreas.picEmployeeId,
      picName: employees.name,
    })
    .from(fiveRMasterAreas)
    .leftJoin(sites, eq(fiveRMasterAreas.siteId, sites.id))
    .leftJoin(employees, eq(fiveRMasterAreas.picEmployeeId, employees.id))
    .where(eq(fiveRMasterAreas.isActive, true))
    .orderBy(asc(fiveRMasterAreas.siteId), asc(fiveRMasterAreas.name))

  console.log(`Total Master Areas: ${areas.length}`)
  console.table(areas)
}

main().then(() => process.exit(0)).catch(console.error)
