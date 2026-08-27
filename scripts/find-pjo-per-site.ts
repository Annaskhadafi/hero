import { db } from '../db';
import { sites, employees } from '../db/schema/hero';
import { eq, and, asc, like, or } from 'drizzle-orm';

async function main() {
  const allSites = await db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name));

  console.log('=== POTENSI PJO PER SITE ===\n');
  console.log('(Berdasarkan job title: PJO, Head, Manager, Superintendent, Foreman)\n');

  for (const site of allSites) {
    // Find employees at this site with relevant job titles
    const candidates = await db.select({
      id: employees.id,
      name: employees.name,
      jobTitle: employees.jobTitle,
      section: employees.section,
      accessRole: employees.accessRole,
    }).from(employees)
      .where(
        and(
          eq(employees.siteId, site.id),
          eq(employees.isActive, true),
          or(
            like(employees.jobTitle, '%PJO%'),
            like(employees.jobTitle, '%Head%'),
            like(employees.jobTitle, '%Manager%'),
            like(employees.jobTitle, '%Superintendent%'),
            like(employees.jobTitle, '%Foreman%'),
            like(employees.jobTitle, '%Supervisor%'),
            eq(employees.accessRole, 'PJO'),
          )
        )
      )
      .orderBy(asc(employees.jobTitle));

    console.log(`${site.name} (ID: ${site.id}):`);
    
    if (candidates.length > 0) {
      for (const c of candidates) {
        console.log(`  👤 ${c.name} | Job: ${c.jobTitle} | Section: ${c.section || 'N/A'} | Role: ${c.accessRole || 'N/A'}`);
      }
    } else {
      console.log(`  ❌ Tidak ada kandidat PJO ditemukan`);
    }

    console.log('');
  }
}

main().catch(console.error);
