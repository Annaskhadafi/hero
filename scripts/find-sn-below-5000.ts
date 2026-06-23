import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

async function main() {
  const legacy = await db
    .select({ id: employees.id, name: employees.name, employeeSn: employees.employeeSn, email: employees.email, isActive: employees.isActive })
    .from(employees)
    .where(sql`CAST(${employees.employeeSn} AS INTEGER) < 5000 AND ${employees.employeeSn} ~ '^\\d+$'`)
    .orderBy(sql`CAST(${employees.employeeSn} AS INTEGER)`);

  console.log("=== employees with SN < 5000 ===");
  console.log("Total:", legacy.length, "\n");
  for (const e of legacy) {
    console.log(`  id=${e.id} | sn=${e.employeeSn} | "${e.name}" | active=${e.isActive}`);
  }

  const hr = await db
    .select({ id: hrEmployees.id, name: hrEmployees.fullName, employeeSn: hrEmployees.employeeId, email: hrEmployees.email, isActive: hrEmployees.isActive })
    .from(hrEmployees)
    .where(sql`CAST(${hrEmployees.employeeId} AS INTEGER) < 5000 AND ${hrEmployees.employeeId} ~ '^\\d+$'`)
    .orderBy(sql`CAST(${hrEmployees.employeeId} AS INTEGER)`);

  console.log("\n=== hr_employees with SN < 5000 ===");
  console.log("Total:", hr.length, "\n");
  for (const e of hr) {
    console.log(`  id=${e.id} | sn=${e.employeeSn} | "${e.name}" | active=${e.isActive}`);
  }

  process.exit(0);
}
main().catch(console.error);
