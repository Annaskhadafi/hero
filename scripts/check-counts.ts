import { db } from "../db/index.ts";
import { employees } from "../db/schema/hero.ts";
import { eq, sql } from "drizzle-orm";

async function run() {
  const employeeCounts = await db
    .select({
      siteId: employees.siteId,
      count: sql<number>`count(distinct ${employees.id})::int`,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .groupBy(employees.siteId);

  console.log(employeeCounts);
  
  const countMap = new Map(employeeCounts.map((row) => [row.siteId, row.count]));
  console.log("Count Map size:", countMap.size);
  console.log("Map for site 126:", countMap.get(126));

  process.exit(0);
}

run().catch(console.error);
