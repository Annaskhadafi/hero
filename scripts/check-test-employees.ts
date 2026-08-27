import { db } from '../db';
import { employees, sites } from '../db/schema/hero';
import { eq, and, asc } from 'drizzle-orm';
async function main() {
  // Find employees in section 34 (same as APD matrix) with site 138 (CK MHU)
  const emps = await db.select({
    id: employees.id, name: employees.name, email: employees.email, 
    sectionId: employees.sectionId, section: employees.section, siteId: employees.siteId
  }).from(employees)
    .where(and(eq(employees.sectionId, 34), eq(employees.siteId, 138), eq(employees.isActive, true)))
    .orderBy(asc(employees.name))
    .limit(10);
  
  console.log('Employees in Section 34 / Site 138 (CK MHU):');
  for (const e of emps) {
    console.log(`  #${e.id} ${e.name} | ${e.email} | Section:${e.section} | Site:${e.siteId}`);
  }
  
  if (emps.length === 0) {
    // Try section 34 any site
    const emps2 = await db.select({
      id: employees.id, name: employees.name, email: employees.email,
      section: employees.section, siteId: employees.siteId
    }).from(employees)
      .where(and(eq(employees.sectionId, 34), eq(employees.isActive, true)))
      .orderBy(asc(employees.name))
      .limit(5);
    console.log('\nSection 34 any site:');
    for (const e of emps2) {
      console.log(`  #${e.id} ${e.name} | ${e.email} | Site:${e.siteId}`);
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
