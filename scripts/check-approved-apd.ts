import { db } from '../db';
import { apdRequests, employees, sites } from '../db/schema/hero';
import { eq, desc } from 'drizzle-orm';
async function main() {
  const requests = await db.select({
    id: apdRequests.id,
    requestNumber: apdRequests.requestNumber,
    employeeId: apdRequests.employeeId,
    siteId: apdRequests.siteId,
    status: apdRequests.status,
    requestCategory: apdRequests.requestCategory,
  }).from(apdRequests).orderBy(desc(apdRequests.id)).limit(15);
  
  console.log('Recent APD requests:');
  for (const r of requests) {
    const emp = await db.select({ name: employees.name, sectionId: employees.sectionId, section: employees.section }).from(employees).where(eq(employees.id, r.employeeId)).limit(1);
    const site = await db.select({ name: sites.name }).from(sites).where(eq(sites.id, r.siteId)).limit(1);
    console.log(`#${r.id} ${r.requestNumber} | ${emp[0]?.name} | Section:${emp[0]?.section} (${emp[0]?.sectionId}) | Site:${site[0]?.name} (${r.siteId}) | Status:${r.status}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
