import { db } from "@/db";
import { employees, hrEmployees, masterDepartments, masterSections, sites } from "@/db/schema/hero";
import { eq, inArray } from "drizzle-orm";

// Map: deleted SN → keep SN
const SN_MAP: Record<string, { keepSn: string; keepId: number }> = {
  "142": { keepSn: "77170", keepId: 1375 },
  "177": { keepSn: "15315", keepId: 955 },
  "133": { keepSn: "28610", keepId: 980 },
  "185": { keepSn: "33101", keepId: 986 },
  "183": { keepSn: "20273", keepId: 965 },
  "141": { keepSn: "77169", keepId: 1374 },
  "179": { keepSn: "13973", keepId: 15 },
  "193": { keepSn: "71491", keepId: 1121 },
  "155": { keepSn: "76433", keepId: 1339 },
  "192": { keepSn: "10318", keepId: 948 },
  "162": { keepSn: "24275", keepId: 975 },
  "145": { keepSn: "47823", keepId: 1009 },
  "198": { keepSn: "74133", keepId: 1256 },
  "199": { keepSn: "51267", keepId: 1041 },
  "182": { keepSn: "36683", keepId: 991 },
  "180": { keepSn: "23396", keepId: 973 },
  "174": { keepSn: "71124", keepId: 1108 },
  "176": { keepSn: "23336", keepId: 972 },
  "154": { keepSn: "28142", keepId: 977 },
  "194": { keepSn: "20", keepId: 941 },
  "197": { keepSn: "18812", keepId: 959 },
};

async function main() {
  const deleteSns = Object.keys(SN_MAP);
  const deleteRows = await db
    .select({ id: employees.id, employeeSn: employees.employeeSn, name: employees.name })
    .from(employees)
    .where(inArray(employees.employeeSn, deleteSns));

  const deleteIds = deleteRows.map((r) => r.id);
  console.log(`Found ${deleteIds.length} records to delete:\n`);
  for (const r of deleteRows) {
    const m = SN_MAP[r.employeeSn];
    console.log(`  DELETE employees.id=${r.id} | sn=${r.employeeSn} | "${r.name}" → keep sn=${m.keepSn}`);
  }

  // Redirect head references
  const headTables = [
    { table: masterDepartments, col: masterDepartments.headEmployeeId, name: "masterDepartments" },
    { table: masterSections, col: masterSections.headEmployeeId, name: "masterSections" },
    { table: sites, col: sites.headEmployeeId, name: "sites" },
  ];
  for (const { table, col, name } of headTables) {
    const refs = await db.select({ id: (table as any).id, headId: col }).from(table).where(inArray(col, deleteIds));
    for (const ref of refs) {
      const m = SN_MAP[String(ref.headId)];
      if (m) {
        await db.update(table).set({ headEmployeeId: m.keepId }).where(eq((table as any).id, ref.id));
        console.log(`  [${name}.id=${ref.id}] headEmployeeId ${ref.headId} → ${m.keepId}`);
      }
    }
  }

  // Ensure keep records active
  const keepIds = [...new Set(Object.values(SN_MAP).map((m) => m.keepId))];
  await db.update(employees).set({ isActive: true }).where(inArray(employees.id, keepIds));

  // Delete
  await db.delete(employees).where(inArray(employees.id, deleteIds));
  console.log(`\nDeleted ${deleteIds.length} duplicate employee records.`);
  process.exit(0);
}
main().catch(console.error);
