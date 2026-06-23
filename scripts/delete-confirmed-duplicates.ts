import { db } from "@/db";
import { employees, masterDepartments, masterSections, sites } from "@/db/schema/hero";
import { eq, inArray } from "drizzle-orm";

const DELETE_TO_CANONICAL: Record<number, number> = {
  95: 1094,   // M. Abian → Muhammad Abian Husain
  105: 998,   // Sandy Tj. → Sandy
  100: 1152,  // Unggul H. → Unggul Hasudungan Sidabodak
};

const toDelete = Object.keys(DELETE_TO_CANONICAL).map(Number);

async function main() {
  const headTables = [
    { table: masterDepartments, col: masterDepartments.headEmployeeId, name: "masterDepartments" },
    { table: masterSections, col: masterSections.headEmployeeId, name: "masterSections" },
    { table: sites, col: sites.headEmployeeId, name: "sites" },
  ];
  for (const { table, col, name } of headTables) {
    const rows = await db.select({ id: (table as any).id, headId: col }).from(table).where(inArray(col, toDelete));
    for (const row of rows) {
      const cid = DELETE_TO_CANONICAL[row.headId as number];
      if (cid) { await db.update(table).set({ headEmployeeId: cid }).where(eq((table as any).id, row.id)); console.log(`[${name}.id=${row.id}] head → ${cid}`); }
    }
  }
  await db.update(employees).set({ isActive: true }).where(inArray(employees.id, [...new Set(Object.values(DELETE_TO_CANONICAL))]));
  await db.delete(employees).where(inArray(employees.id, toDelete));
  console.log(`Deleted ${toDelete.length} records: ${toDelete.join(", ")}`);
  process.exit(0);
}
main().catch(console.error);
