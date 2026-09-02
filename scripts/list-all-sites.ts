import { db } from '@/db'
import { sites, employees } from '@/db/schema/hero'
import { asc } from 'drizzle-orm'

async function main() {
  const allSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      location: sites.location,
      customerName: sites.customerName,
      siteType: sites.siteType,
      headEmployeeId: sites.headEmployeeId,
      isActive: sites.isActive,
    })
    .from(sites)
    .orderBy(asc(sites.name))

  const allEmps = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
  const empMap = new Map(allEmps.map((e) => [e.id, e.name]))

  console.log('TOTAL SITES:', allSites.length)
  for (const s of allSites) {
    const pjo = s.headEmployeeId ? empMap.get(s.headEmployeeId) || `ID:${s.headEmployeeId}` : '-'
    console.log(`[${s.id}] ${s.name} | Lokasi: ${s.location} | Customer: ${s.customerName} | PJO: ${pjo} | Type: ${s.siteType} | Status: ${s.isActive ? 'Aktif' : 'Non-Aktif'}`)
  }
  process.exit(0)
}

main().catch(console.error)
