import { db } from '../db';
import { employees, masterSections, sites } from '../db/schema/hero';
import { eq, sql, asc } from 'drizzle-orm';

async function main() {
  // Get sections with their sites
  const sectionSites = await db.select({
    sectionName: masterSections.name,
    sectionCode: masterSections.code,
    siteName: sites.name,
    employeeCount: sql<number>`count(*)::int`,
  })
  .from(employees)
  .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
  .leftJoin(sites, eq(employees.siteId, sites.id))
  .where(eq(employees.isActive, true))
  .groupBy(masterSections.name, masterSections.code, sites.name)
  .orderBy(asc(masterSections.name), asc(sites.name));

  console.log('=== Sections & Sites ===\n');
  
  let currentSection = '';
  sectionSites.forEach((s) => {
    if (s.sectionName !== currentSection) {
      currentSection = s.sectionName || 'Unknown';
      console.log(`\n[${s.sectionCode}] ${currentSection}`);
    }
    console.log(`  - ${s.siteName || 'No Site'} (${s.employeeCount} karyawan)`);
  });
}

main().catch(console.error);
