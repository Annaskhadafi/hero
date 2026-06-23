import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";
import { eq, sql } from "drizzle-orm";

async function main() {
  // Ambil semua hr_employees sebagai source of truth
  const hr = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeSn: hrEmployees.employeeId,
      email: hrEmployees.email,
      departmentId: hrEmployees.departmentId,
      sectionId: hrEmployees.sectionId,
    })
    .from(hrEmployees);

  let updatedLegacyCount = 0;
  let skippedCount = 0;

  for (const h of hr) {
    if (!h.employeeSn && !h.email) continue;

    // Cari employees legacy yg match by SN atau email
    const legacyMatches = await db
      .select({ id: employees.id, name: employees.name, employeeSn: employees.employeeSn, email: employees.email })
      .from(employees)
      .where(
        h.email
          ? sql`${employees.employeeSn} = ${h.employeeSn} OR ${employees.email} = ${h.email}`
          : sql`${employees.employeeSn} = ${h.employeeSn}`
      );

    for (const legacy of legacyMatches) {
      const needsNameUpdate = legacy.name !== h.name;
      if (needsNameUpdate) {
        await db
          .update(employees)
          .set({
            name: h.name,
            departmentId: h.departmentId,
            sectionId: h.sectionId,
          })
          .where(eq(employees.id, legacy.id));
        console.log(`[UPDATE] employees.id=${legacy.id} | "${legacy.name}" → "${h.name}"`);
        updatedLegacyCount++;
      } else {
        skippedCount++;
      }
    }
  }

  console.log(`\nDone. Updated: ${updatedLegacyCount}, Skipped (already match): ${skippedCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
