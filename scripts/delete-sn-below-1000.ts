import { db } from "@/db";
import { employees, masterDepartments, masterSections, sites } from "@/db/schema/hero";
import { eq, inArray } from "drizzle-orm";

const deleteIds = [23, 32, 46, 55, 68, 77, 84, 93, 99, 109];

async function main() {
  // Check head references
  const headTables = [
    { table: masterDepartments, col: masterDepartments.headEmployeeId, name: "masterDepartments" },
    { table: masterSections, col: masterSections.headEmployeeId, name: "masterSections" },
    { table: sites, col: sites.headEmployeeId, name: "sites" },
  ];
  for (const { table, col, name } of headTables) {
    const refs = await db.select({ id: (table as any).id, headId: col }).from(table).where(inArray(col, deleteIds));
    for (const r of refs) {
      console.log(`WARN: ${name}.id=${r.id} references headId=${r.headId} (being deleted)`);
    }
  }

  // Delete
  await db.delete(employees).where(inArray(employees.id, deleteIds));
  console.log(`Deleted ${deleteIds.length} employees: ${deleteIds.join(", ")}`);
  process.exit(0);
}
main().catch(console.error);
