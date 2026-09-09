import { db } from "@/db";
import { masterDepartments, masterSections } from "@/db/schema/hero";

const DEPARTMENT_SEEDS: Array<{ code: string; name: string; description: string; isActive: boolean }> = [];

const SECTION_SEEDS: Array<{ code: string; name: string; departmentCode: string; description: string }> = [];

export async function ensureDepartmentSectionSeedData() {
  const existingDepts = await db.select().from(masterDepartments);
  const existingDeptCodes = new Set(existingDepts.map(d => d.code));
  const missingDepts = DEPARTMENT_SEEDS.filter(d => !existingDeptCodes.has(d.code));
  if (missingDepts.length > 0) await db.insert(masterDepartments).values(missingDepts);
  const allDepts = await db.select().from(masterDepartments);
  const deptByCode = Object.fromEntries(allDepts.map(d => [d.code, d]));
  const existingSections = await db.select().from(masterSections);
  const existingSectionCodes = new Set(existingSections.map(s => s.code));
  const sectionsToInsert = SECTION_SEEDS.filter(s => !existingSectionCodes.has(s.code)).map(s => ({ code: s.code, name: s.name, departmentId: deptByCode[s.departmentCode]?.id ?? null, description: s.description, isActive: true }));
  if (sectionsToInsert.length > 0) await db.insert(masterSections).values(sectionsToInsert);
}
