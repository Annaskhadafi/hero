import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

async function main() {
  console.log("--- SECTIONS IN EMPLOYEES TABLE ---");
  const sectionValues = await db
    .select({
      section: employees.section,
      sectionId: employees.sectionId,
      count: sql<number>`count(*)::int`,
    })
    .from(employees)
    .groupBy(employees.section, employees.sectionId);
  console.log(sectionValues);
}

main().catch(console.error);
