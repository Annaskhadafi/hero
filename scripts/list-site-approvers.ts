import { db } from '@/db'
import { sites, employees } from '@/db/schema/hero'
import { eq, or, ilike, and, inArray } from 'drizzle-orm'

async function main() {
  const allSites = await db.select().from(sites)
  const allEmps = await db.select().from(employees).where(eq(employees.isActive, true))
  const empMap = new Map(allEmps.map((e) => [e.id, e]))

  const adminCpSiteIds = [142, 132, 126, 135] // CK NCN, Gresik, Balikpapan, Batu Hijau
  const hseSiteIds = [128, 131, 133, 129, 140] // CK MHU, CK BMB, CK BIB, CK KIM, Vale

  console.log('=== 1. ADMIN CP SITES (4 Site) ===')
  for (const id of adminCpSiteIds) {
    const s = allSites.find((site) => site.id === id)
    console.log(`Site: [${s?.id}] ${s?.name} (${s?.location})`)
    console.log(`  - Service MVC & Others : Muhammad As'ar Fauzan (Jabatan: Serviceman)`)
    console.log(`  - Repair / Retread     : Arjun Zahiri Mursith (Jabatan: Repairman)`)
    console.log(`  - Technical (TE)       : Muhammad Abian Husain (Jabatan: Technical Engineer)`)
  }

  console.log('\n=== 2. HSE SITES (5 Site) ===')
  for (const id of hseSiteIds) {
    const s = allSites.find((site) => site.id === id)
    // Find HSE employee on this site
    const hseEmps = allEmps.filter(
      (e) =>
        e.siteId === id &&
        (e.jobTitle?.toLowerCase().includes('hse') ||
          e.jobTitle?.toLowerCase().includes('safety') ||
          e.department?.toLowerCase().includes('hse') ||
          e.department?.toLowerCase().includes('safety'))
    )
    console.log(`Site: [${s?.id}] ${s?.name}:`)
    if (hseEmps.length > 0) {
      for (const h of hseEmps) {
        console.log(`  - HSE: ${h.name} | Jabatan: ${h.jobTitle} | Email: ${h.email}`)
      }
    } else {
      console.log(`  - HSE: (Belum ada karyawan berjabatan HSE khusus di site ini, fallback PJO: ${s?.headEmployeeId ? empMap.get(s.headEmployeeId)?.name : 'None'})`)
    }
  }

  console.log('\n=== 3. PJO SITES (22 Site) ===')
  const pjoSites = allSites.filter(
    (s) => !adminCpSiteIds.includes(s.id) && !hseSiteIds.includes(s.id)
  )
  for (const s of pjoSites) {
    const pjo = s.headEmployeeId ? empMap.get(s.headEmployeeId) : null
    console.log(`Site: [${s.id}] ${s.name} | PJO: ${pjo ? `${pjo.name} (${pjo.jobTitle})` : 'Belum ditentukan'} | Email: ${pjo?.email || '-'}`)
  }

  process.exit(0)
}

main().catch(console.error)
