import { db } from '@/db'
import { employees, sites } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getMasterAreasAction } from '@/app/dashboard/quality/5r/actions'
import { FiveRMasterArea } from '@/components/five-r/five-r-master-area'

export const dynamic = 'force-dynamic'

export default async function MasterAreaPage() {
  const masterAreasRes = await getMasterAreasAction()

  const allSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .orderBy(sites.name)

  const allEmployees = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(employees.name)

  return (
    <div className="p-6">
      <FiveRMasterArea
        initialAreas={masterAreasRes.data as any}
        sites={allSites}
        employees={allEmployees}
      />
    </div>
  )
}
