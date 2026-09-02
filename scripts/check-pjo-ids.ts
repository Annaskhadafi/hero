import { db } from '@/db'
import { sites, employees } from '@/db/schema/hero'
import { inArray } from 'drizzle-orm'

async function main() {
  const pjoSiteIds = [138, 144, 210, 150, 145, 125, 151, 134, 136, 149, 127, 139, 130]
  const rows = await db.select().from(sites).where(inArray(sites.id, pjoSiteIds))
  const headIds = rows.map((r) => r.headEmployeeId).filter((id): id is number => id != null)
  const emps = await db.select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle }).from(employees).where(inArray(employees.id, headIds))
  const empMap = new Map(emps.map((e) => [e.id, e]))

  for (const s of rows) {
    const e = s.headEmployeeId ? empMap.get(s.headEmployeeId) : null
    console.log(`Site [${s.id}] ${s.name} -> headEmployeeId: ${s.headEmployeeId} (${e?.name} - ${e?.jobTitle})`)
  }
  process.exit(0)
}
main().catch(console.error)
