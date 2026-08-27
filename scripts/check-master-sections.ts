import { db } from '../db';
import { masterSections, employees } from '../db/schema/hero';
import { eq, sql } from 'drizzle-orm';

async function main() {
  // Get all sections with their head employees
  const sections = await db.select({
    id: masterSections.id,
    name: masterSections.name,
    headEmployeeId: masterSections.headEmployeeId,
    siteId: masterSections.siteId,
  }).from(masterSections);

  console.log(`=== Master Sections (${sections.length}) ===`);
  
  // Group by siteId
  const sectionsBySite = new Map<number, typeof sections>();
  for (const section of sections) {
    const siteId = section.siteId;
    if (!sectionsBySite.has(siteId)) {
      sectionsBySite.set(siteId, []);
    }
    sectionsBySite.get(siteId)!.push(section);
  }

  // Show sections per site
  for (const [siteId, siteSections] of sectionsBySite) {
    console.log(`\nSite ${siteId}:`);
    for (const section of siteSections) {
      const headName = section.headEmployeeId 
        ? (await db.select({ name: employees.name }).from(employees).where(eq(employees.id, section.headEmployeeId)).limit(1))[0]?.name || 'unknown'
        : '(no head)';
      console.log(`  [${section.id}] ${section.name} → Head: ${headName} (employeeId=${section.headEmployeeId})`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
