import { db } from "@/db";
import { employees, masterDepartments, masterSections, sites } from "@/db/schema/hero";
import { eq, inArray } from "drizzle-orm";

// Map abbreviated employee IDs → canonical employee IDs
const DELETE_TO_CANONICAL: Record<number, number> = {
  49: 1340,   // Ade Fazri → Ade Fazri Hariyadi
  69: 947,    // Yean Alan Fabian → Yean Alan Fabian Antonio M
};

const toDelete = Object.keys(DELETE_TO_CANONICAL).map(Number);

async function main() {
  // 1. Redirect head references
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

  // 2. Ensure canonical records active
  const canonicalIds = Array.from(new Set(Object.values(DELETE_TO_CANONICAL)));
  await db
    .update(employees)
    .set({ isActive: true })
    .where(inArray(employees.id, canonicalIds));

  // 3. Delete abbreviated records
  await db.delete(employees).where(inArray(employees.id, toDelete));

  console.log(`\nDeleted ${toDelete.length} abbreviated employee records: ${toDelete.join(", ")}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
