import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

async function main() {
  const name = process.argv[2] || "Havid";
  const like = `%${name}%`;

  const legacy = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      isActive: employees.isActive,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
    })
    .from(employees)
    .where(sql`LOWER(${employees.name}) LIKE LOWER(${like})`);

  const hr = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeSn: hrEmployees.employeeId,
      email: hrEmployees.email,
      isActive: hrEmployees.isActive,
      departmentId: hrEmployees.departmentId,
      sectionId: hrEmployees.sectionId,
    })
    .from(hrEmployees)
    .where(sql`LOWER(${hrEmployees.fullName}) LIKE LOWER(${like})`);

  console.log(`\n${legacy.length} employees records:\n`);
  for (const e of legacy) {
    console.log(`  [employees] id=${e.id} | sn=${e.employeeSn || "-"} | "${e.name}" | active=${e.isActive}`);
  }

  console.log(`\n${hr.length} hr_employees records:\n`);
  for (const e of hr) {
    console.log(`  [hr_employees] id=${e.id} | sn=${e.employeeSn || "-"} | "${e.name}" | active=${e.isActive}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
