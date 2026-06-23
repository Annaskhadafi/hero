import { db } from "@/db";
import { employees, hrEmployees, masterDepartments, masterSections, masterPositions, sites } from "@/db/schema/hero";
import { eq, inArray, sql } from "drizzle-orm";

// Map abbreviated employee IDs → canonical employee IDs
const DELETE_TO_CANONICAL: Record<number, number> = {
  16: 1047,   // Meita Putri R. → Meita Putri Rahayu
  98: 1103,   // Luthfi Mahendra Y. → Luthfi Mahendra Yudistira
  21: 1196,   // Aulia Rizki W. → Aulia Rizki walidina
  25: 1008,   // Andana G. → Andana Gustafianto
  70: 969,    // Agung Ari P. → Agung Ari Prasetio
  48: 1307,   // M. Wahyu I. → Muhammad Wahyu Ichsan
  41: 1073,   // Ridho Akmal S. → Ridho Akmal Sholeh
  33: 962,    // Aditya Jarangmula N. → Aditya Jarangmula Ngindra
  74: 1010,   // M. Ikbal Laisa → Muhammad Ikbal Laisa
  29: 1293,   // Muh. Herdiman Effendi → Muh Herdiman Effendi
  30: 1321,   // M. Ali Porwanto → Muchamat Ali Porwanto
};

const toDelete = Object.keys(DELETE_TO_CANONICAL).map(Number);

async function main() {
  // 1. Reactivate canonical record yg mungkin sempat di-deactivate
  const canonicalIds = Array.from(new Set(Object.values(DELETE_TO_CANONICAL)));
  await db
    .update(employees)
    .set({ isActive: true })
    .where(inArray(employees.id, canonicalIds));
  console.log(`Reactivated ${canonicalIds.length} canonical records`);

  // 2. Check & redirect head references
  const headTables = [
    { table: masterDepartments, col: masterDepartments.headEmployeeId, name: "masterDepartments" },
    { table: masterSections, col: masterSections.headEmployeeId, name: "masterSections" },
    { table: sites, col: sites.headEmployeeId, name: "sites" },
  ];

  for (const { table, col, name } of headTables) {
    const rows = await db
      .select({ id: (table as any).id, headId: col })
      .from(table)
      .where(inArray(col, toDelete));

    for (const row of rows) {
      const canonicalId = DELETE_TO_CANONICAL[row.headId as number];
      if (canonicalId) {
        await db
          .update(table)
          .set({ headEmployeeId: canonicalId })
          .where(eq((table as any).id, row.id));
        console.log(`[${name}.id=${row.id}] headEmployeeId ${row.headId} → ${canonicalId}`);
      }
    }
  }

  // 3. Hapus dari hr_employees kalau ada record dengan SN/email yg sama (karena yg singkat ga mungkin ada di hr)
  const delEmployees = await db
    .select({ id: employees.id, employeeSn: employees.employeeSn, email: employees.email })
    .from(employees)
    .where(inArray(employees.id, toDelete));

  for (const emp of delEmployees) {
    if (emp.employeeSn || emp.email) {
      await db
        .delete(hrEmployees)
        .where(
          emp.email
            ? sql`${hrEmployees.employeeId} = ${emp.employeeSn} OR ${hrEmployees.email} = ${emp.email}`
            : sql`${hrEmployees.employeeId} = ${emp.employeeSn}`
        );
    }
  }

  // 4. Hapus record employees yg singkat
  await db.delete(employees).where(inArray(employees.id, toDelete));

  console.log(`\nDeleted ${toDelete.length} abbreviated employee records: ${toDelete.join(", ")}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
