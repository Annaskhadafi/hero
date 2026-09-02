import { db } from '../db'
import { fiveRMasterAreas } from '../db/schema/five-r'
import { employees, sites } from '../db/schema/hero'
import { eq } from 'drizzle-orm'
import { resolveFiveRApprovalRoute } from '../lib/five-r-approval'

async function main() {
  const areas = await db
    .select({
      id: fiveRMasterAreas.id,
      name: fiveRMasterAreas.name,
      siteId: fiveRMasterAreas.siteId,
      siteName: sites.name,
      picName: employees.name,
    })
    .from(fiveRMasterAreas)
    .leftJoin(sites, eq(fiveRMasterAreas.siteId, sites.id))
    .leftJoin(employees, eq(fiveRMasterAreas.picEmployeeId, employees.id))
    .orderBy(fiveRMasterAreas.id)

  console.log(`Total Master Area: ${areas.length}\n`)
  console.log('| No | Master Area 5R | Site / Lokasi | PIC Area | Tahap 1: PJO / Atasan Langsung | Tahap 2: Head of CPI |')
  console.log('|---|---|---|---|---|---|')

  for (let i = 0; i < areas.length; i++) {
    const a = areas[i]
    const route = await resolveFiveRApprovalRoute({ areaId: a.id, siteId: a.siteId })
    const step1 = route.steps[0]?.approverName ?? '-'
    const step2 = route.steps[1]?.approverName ?? '-'
    console.log(`| ${i + 1} | **${a.name}** | ${a.siteName ?? '-'} | ${a.picName ?? '-'} | ${step1} | ${step2} |`)
  }
}

main().then(() => process.exit(0)).catch(console.error)
