import { db } from "@/db";
import { employees, hrEmployees, masterPositions, masterSections } from "@/db/schema/hero";
import { eq, inArray, sql, isNull, and } from "drizzle-orm";

async function main() {
  // 1. Count active employees per section from both tables
  const sectionRows = await db
    .select({ id: masterSections.id, code: masterSections.code, name: masterSections.name })
    .from(masterSections)
    .orderBy(masterSections.code);

  const emptySections: typeof sectionRows = [];

  for (const section of sectionRows) {
    const [legacyCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(and(eq(employees.sectionId, section.id), eq(employees.isActive, true)));

    const [hrCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hrEmployees)
      .where(and(eq(hrEmployees.sectionId, section.id), eq(hrEmployees.isActive, true)));

    if ((legacyCount.count ?? 0) === 0 && (hrCount.count ?? 0) === 0) {
      emptySections.push(section);
    }
  }

  console.log(`Found ${emptySections.length} empty sections:\n`);
  for (const s of emptySections) {
    console.log(`  id=${s.id} | code=${s.code} | name="${s.name}"`);
  }

  if (emptySections.length === 0) {
    process.exit(0);
  }

  const emptyIds = emptySections.map((s) => s.id);

  // 2. Check references in masterPositions
  const positionRefs = await db
    .select({ id: masterPositions.id, sectionId: masterPositions.sectionId })
    .from(masterPositions)
    .where(inArray(masterPositions.sectionId, emptyIds));

  if (positionRefs.length > 0) {
    console.log(`\n${positionRefs.length} masterPositions reference empty sections. Nullifying...`);
    await db
      .update(masterPositions)
      .set({ sectionId: null })
      .where(inArray(masterPositions.sectionId, emptyIds));
  }

  // 3. Check references in employees/hrEmployees (should be 0, but nullify just in case inactive)
  const legacyRefs = await db
    .select({ id: employees.id })
    .from(employees)
    .where(inArray(employees.sectionId, emptyIds));

  if (legacyRefs.length > 0) {
    console.log(`\n${legacyRefs.length} employees (including inactive) reference empty sections. Nullifying...`);
    await db
      .update(employees)
      .set({ sectionId: null })
      .where(inArray(employees.sectionId, emptyIds));
  }

  const hrRefs = await db
    .select({ id: hrEmployees.id })
    .from(hrEmployees)
    .where(inArray(hrEmployees.sectionId, emptyIds));

  if (hrRefs.length > 0) {
    console.log(`\n${hrRefs.length} hr_employees (including inactive) reference empty sections. Nullifying...`);
    await db
      .update(hrEmployees)
      .set({ sectionId: null })
      .where(inArray(hrEmployees.sectionId, emptyIds));
  }

  // 4. Delete empty sections
  await db.delete(masterSections).where(inArray(masterSections.id, emptyIds));

  console.log(`\nDeleted ${emptySections.length} empty sections.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
