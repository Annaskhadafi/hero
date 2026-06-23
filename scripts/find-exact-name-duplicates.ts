import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

async function main() {
  // Find exact name duplicates in employees table
  const dupes = await db
    .select({
      name: employees.name,
      count: sql<number>`count(*)::int`,
      ids: sql<string>`string_agg(id::text, ',')`,
      sns: sql<string>`string_agg(coalesce(${employees.employeeSn}, '-'), ',')`,
    })
    .from(employees)
    .where(sql`${employees.isActive} = true`)
    .groupBy(employees.name)
    .having(sql`count(*) > 1`);

  console.log(`\nExact name duplicates in employees table:\n`);
  for (const d of dupes) {
    console.log(`  "${d.name}" — ${d.count}x — ids: [${d.ids}] — sn: [${d.sns}]`);
  }

  if (dupes.length === 0) console.log("  (none)");

  // Also check hr_employees for exact name duplicates
  const hrDupes = await db
    .select({
      name: hrEmployees.fullName,
      count: sql<number>`count(*)::int`,
      ids: sql<string>`string_agg(id::text, ',')`,
      sns: sql<string>`string_agg(coalesce(${hrEmployees.employeeId}, '-'), ',')`,
    })
    .from(hrEmployees)
    .where(sql`${hrEmployees.isActive} = true`)
    .groupBy(hrEmployees.fullName)
    .having(sql`count(*) > 1`);

  console.log(`\nExact name duplicates in hr_employees table:\n`);
  for (const d of hrDupes) {
    console.log(`  "${d.name}" — ${d.count}x — ids: [${d.ids}] — sn: [${d.sns}]`);
  }
  if (hrDupes.length === 0) console.log("  (none)");

  process.exit(0);
}
main().catch(console.error);
