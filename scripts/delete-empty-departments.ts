import { db } from "@/db";
import { employees, hrEmployees, masterPositions, masterSections, masterDepartments } from "@/db/schema/hero";
import { eq, inArray, sql, and } from "drizzle-orm";

async function main() {
  const deptRows = await db
    .select({ id: masterDepartments.id, code: masterDepartments.code, name: masterDepartments.name })
    .from(masterDepartments)
    .orderBy(masterDepartments.code);

  const emptyDepts: typeof deptRows = [];

  for (const dept of deptRows) {
    const [legacyCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(and(eq(employees.departmentId, dept.id), eq(employees.isActive, true)));

    const [hrCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hrEmployees)
      .where(and(eq(hrEmployees.departmentId, dept.id), eq(hrEmployees.isActive, true)));

    if ((legacyCount.count ?? 0) === 0 && (hrCount.count ?? 0) === 0) {
      emptyDepts.push(dept);
    }
  }

  console.log(`Found ${emptyDepts.length} empty departments:\n`);
  for (const d of emptyDepts) {
    console.log(`  id=${d.id} | code=${d.code} | name="${d.name}"`);
  }

  if (emptyDepts.length === 0) {
    process.exit(0);
  }

  const emptyIds = emptyDepts.map((d) => d.id);

  // Nullify references
  const positionRefs = await db
    .select({ id: masterPositions.id })
    .from(masterPositions)
    .where(inArray(masterPositions.departmentId, emptyIds));
  if (positionRefs.length > 0) {
    console.log(`\n${positionRefs.length} masterPositions reference empty departments. Nullifying...`);
    await db.update(masterPositions).set({ departmentId: null }).where(inArray(masterPositions.departmentId, emptyIds));
  }

  const sectionRefs = await db
    .select({ id: masterSections.id })
    .from(masterSections)
    .where(inArray(masterSections.departmentId, emptyIds));
  if (sectionRefs.length > 0) {
    console.log(`\n${sectionRefs.length} masterSections reference empty departments. Nullifying...`);
    await db.update(masterSections).set({ departmentId: null }).where(inArray(masterSections.departmentId, emptyIds));
  }

  const legacyRefs = await db
    .select({ id: employees.id })
    .from(employees)
    .where(inArray(employees.departmentId, emptyIds));
  if (legacyRefs.length > 0) {
    console.log(`\n${legacyRefs.length} employees reference empty departments. Nullifying...`);
    await db.update(employees).set({ departmentId: null }).where(inArray(employees.departmentId, emptyIds));
  }

  const hrRefs = await db
    .select({ id: hrEmployees.id })
    .from(hrEmployees)
    .where(inArray(hrEmployees.departmentId, emptyIds));
  if (hrRefs.length > 0) {
    console.log(`\n${hrRefs.length} hr_employees reference empty departments. Nullifying...`);
    await db.update(hrEmployees).set({ departmentId: null }).where(inArray(hrEmployees.departmentId, emptyIds));
  }

  await db.delete(masterDepartments).where(inArray(masterDepartments.id, emptyIds));

  console.log(`\nDeleted ${emptyDepts.length} empty departments.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
