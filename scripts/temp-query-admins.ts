import { db } from '../db';
import { employees, sites } from '../db/schema/hero';
import { ilike, eq, and, notIlike } from 'drizzle-orm';

async function run() {
  const res = await db.select({
    siteName: sites.name,
    name: employees.name,
    accessRole: employees.accessRole,
    role: employees.role,
    jobTitle: employees.jobTitle
  })
  .from(employees)
  .innerJoin(sites, eq(employees.siteId, sites.id))
  .where(
    and(
      notIlike(employees.name, '%[%'), // Exclude generic relative approvers
      notIlike(employees.accessRole, '%Super Admin%') // Focus on Site level admins
    )
  );

  const filtered = res.filter(r => 
    r.accessRole.toLowerCase().includes('admin') || 
    r.role.toLowerCase().includes('admin') || 
    r.jobTitle.toLowerCase().includes('admin')
  );

  // Group by site
  const grouped = filtered.reduce((acc, curr) => {
    if (!acc[curr.siteName]) acc[curr.siteName] = [];
    acc[curr.siteName].push(`${curr.name} (${curr.role} - ${curr.accessRole})`);
    return acc;
  }, {} as Record<string, string[]>);

  console.log(grouped);
  process.exit(0);
}

run();
