import { db } from '@/db'
import { employees, sites, masterDepartments, masterSections } from '@/db/schema/hero'
import { ilike, or, eq, inArray } from 'drizzle-orm'

async function main() {
  console.log('=== CHECKING ADMIN CP CANDIDATES ===')
  const names = ['As\'ar Fauzan', 'Arjun Zahiri', 'Muhammad Abian Husain', 'Abian']
  const matchedEmps = await db
    .select({
      id: employees.id,
      name: employees.name,
      jobTitle: employees.jobTitle,
      email: employees.email,
      department: employees.department,
      section: employees.section,
      siteId: employees.siteId,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(
      or(
        ilike(employees.name, '%As%ar%'),
        ilike(employees.name, '%Fauzan%'),
        ilike(employees.name, '%Arjun%'),
        ilike(employees.name, '%Abian%'),
        ilike(employees.name, '%Husain%')
      )
    )

  console.log('Candidates found:')
  for (const e of matchedEmps) {
    console.log(`- [${e.id}] ${e.name} | Job: "${e.jobTitle}" | Dept: ${e.department} | Sec: ${e.section} | Email: ${e.email} | Active: ${e.isActive}`)
  }

  console.log('\n=== CHECKING SITES FOR ADMIN CP ===')
  const adminCpSiteNames = ['CK NCN', 'Gresik', 'Balikpapan', 'Batu Hijau']
  const adminCpSites = await db
    .select({ id: sites.id, name: sites.name, headEmployeeId: sites.headEmployeeId })
    .from(sites)
    .where(
      or(
        ilike(sites.name, '%CK NCN%'),
        ilike(sites.name, '%Gresik%'),
        ilike(sites.name, '%Balikpapan%'),
        ilike(sites.name, '%Batu Hijau%')
      )
    )
  console.log('Admin CP sites in DB:', adminCpSites)

  console.log('\n=== CHECKING SITES FOR HSE ===')
  const hseSiteNames = ['CK MHU', 'CK BMB', 'CK BIB', 'CK KIM', 'Vale']
  const hseSites = await db
    .select({ id: sites.id, name: sites.name, headEmployeeId: sites.headEmployeeId })
    .from(sites)
    .where(
      or(
        ilike(sites.name, '%MHU%'),
        ilike(sites.name, '%BMB%'),
        ilike(sites.name, '%BIB%'),
        ilike(sites.name, '%KIM%'),
        ilike(sites.name, '%Vale%')
      )
    )
  console.log('HSE sites in DB:', hseSites)

  console.log('\n=== CHECKING HSE EMPLOYEES ON THOSE SITES ===')
  const hseSiteIds = hseSites.map((s) => s.id)
  const hseEmps = await db
    .select({
      id: employees.id,
      name: employees.name,
      jobTitle: employees.jobTitle,
      email: employees.email,
      department: employees.department,
      siteId: employees.siteId,
    })
    .from(employees)
    .where(
      and(
        inArray(employees.siteId, hseSiteIds),
        or(
          ilike(employees.jobTitle, '%hse%'),
          ilike(employees.jobTitle, '%safety%'),
          ilike(employees.department, '%hse%'),
          ilike(employees.department, '%safety%')
        )
      )
    )
  console.log('HSE employees on those sites:', hseEmps)

  // Also check any general HSE employees across all sites
  const allHseEmps = await db
    .select({
      id: employees.id,
      name: employees.name,
      jobTitle: employees.jobTitle,
      email: employees.email,
      siteId: employees.siteId,
      department: employees.department,
    })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        or(
          ilike(employees.jobTitle, '%hse%'),
          ilike(employees.jobTitle, '%safety%'),
          ilike(employees.department, '%hse%'),
          ilike(employees.department, '%safety%')
        )
      )
    )
  console.log(`Total HSE employees in DB: ${allHseEmps.length}`)
  for (const h of allHseEmps) {
    console.log(`  - [${h.id}] ${h.name} | Job: "${h.jobTitle}" | SiteId: ${h.siteId} | Dept: ${h.department}`)
  }

  process.exit(0)
}

function and(...args: any[]) {
  const { and: drizzleAnd } = require('drizzle-orm')
  return drizzleAnd(...args)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
