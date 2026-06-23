import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

async function run() {
  const result = await db
    .select({
      workLocation: employees.workLocation,
      department: employees.department,
      count: sql<number>`count(*)::int`
    })
    .from(employees)
    .groupBy(employees.workLocation, employees.department)
    .orderBy(employees.workLocation, employees.department);
  
  console.log("Combinations:");
  console.dir(result, { maxArrayLength: null });
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
