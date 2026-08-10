import { db } from "../db/index";
import { employees, sites } from "../db/schema/hero";
import { eq, ilike } from "drizzle-orm";

async function main() {
  const results = await db.select({
    name: employees.name,
    role: employees.role,
    accessRole: employees.accessRole,
    department: employees.department,
    siteName: sites.name
  }).from(employees)
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(ilike(employees.name, "%fauzan%"));
    
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch(console.error);
