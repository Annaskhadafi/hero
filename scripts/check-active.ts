import { db } from "../db/index.ts";
import { employees } from "../db/schema/hero.ts";
import { sql } from "drizzle-orm";

async function run() {
  const counts = await db.select({
    isActive: employees.isActive,
    count: sql<number>`count(*)`.as('count')
  }).from(employees).groupBy(employees.isActive);
  
  console.table(counts);
  process.exit(0);
}

run().catch(console.error);

