import { db } from '../db';
import { apdRequests, employees, sites, orgNodeAssignments } from '../db/schema/hero';
import { eq, desc } from 'drizzle-orm';
async function main() {
  // Check APD request #27 (newest)
  const [req] = await db.select().from(apdRequests).where(eq(apdRequests.id, 27)).limit(1);
  if (!req) { console.log('APD #27 not found'); return; }
  
  const emp = await db.select().from(employees).where(eq(employees.id, req.employeeId)).limit(1);
  const site = await db.select().from(sites).where(eq(sites.id, req.siteId)).limit(1);
  
  console.log('APD #27:');
  console.log('  Employee:', emp[0]?.name, 'Section:', emp[0]?.sectionId, 'Site:', req.siteId);
  console.log('  Site name:', site[0]?.name);
  console.log('  Status:', req.status);
  
  // Check what nodes this employee's site has
  const siteName = site[0]?.name || '';
  console.log('\n  Looking for approval matrix for site:', req.siteId);
  
  // Check org chart nodes for site 138
  const nodes = await db.select().from(orgNodeAssignments)
    .where(eq(orgNodeAssignments.employeeId, 5)); // Khadafi
  console.log('\nKhadafi org nodes:', nodes.map(n => n.nodeId).join(', '));
}
main().catch(console.error).finally(() => process.exit(0));
