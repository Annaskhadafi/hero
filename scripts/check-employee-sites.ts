import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

async function run() {
  const counts = await db.select({
    siteId: employees.siteId,
    workLocation: employees.workLocation,
    count: sql<number>`count(*)`.as('count')
  }).from(employees).groupBy(employees.siteId, employees.workLocation);
  
  console.log("Employees groupBy siteId and workLocation:");
  console.table(counts);

  process.exit(0);
}

run().catch(console.error);
