import { db } from '../db';
import { employees } from '../db/schema/hero';
import { eq, sql } from 'drizzle-orm';

async function main() {
  // Get all unique access roles
  const roles = await db.select({
    accessRole: employees.accessRole,
    count: sql<number>`count(*)`,
  }).from(employees).groupBy(employees.accessRole);

  console.log('=== Access Roles in Employees ===');
  for (const role of roles) {
    console.log(`  ${role.accessRole || '(null)'}: ${role.count} employees`);
  }

  // Check employees with 'section head' or similar roles
  console.log('\n=== Employees with Section/Head roles ===');
  const headEmployees = await db.select({
    id: employees.id,
    name: employees.name,
    accessRole: employees.accessRole,
    siteId: employees.siteId,
    sectionId: employees.sectionId,
  }).from(employees).where(
    sql`LOWER(${employees.accessRole}) LIKE '%head%' OR LOWER(${employees.accessRole}) LIKE '%section%'`
  );

  for (const emp of headEmployees) {
    console.log(`  ${emp.name} | role=${emp.accessRole} | site=${emp.siteId} | section=${emp.sectionId}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
