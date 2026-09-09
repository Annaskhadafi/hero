import { db } from "@/db";
import { masterDepartments, masterSections, employees } from "@/db/schema/hero";
import { inArray } from "drizzle-orm";

export const OBSOLETE_DEPARTMENT_CODES = [
  "DEPT_BI_MARKETING",
  "DEPT_FINANCE",
  "DEPT_OPERATION",
  "DEPT_TECHNICAL",
  "DEPT_QHSE",
];

export const OBSOLETE_SECTION_CODES = [
  "SEC_BI", "SEC_MARKETING", "SEC_DATABASE", "SEC_IT", "SEC_FIN_BP",
  "SEC_FINANCE", "SEC_ACCOUNTING", "SEC_TAX", "SEC_PROCUREMENT",
  "SEC_OPERATION", "SEC_PM", "SEC_LOGISTIC", "SEC_ADMIN",
  "SEC_TECHNICAL", "SEC_ENGINEERING", "SEC_MAINTENANCE",
  "SEC_QUALITY", "SEC_HSE",
];

const DEPARTMENT_SEEDS: Array<{ code: string; name: string; description: string; isActive: boolean }> = [];
const SECTION_SEEDS: Array<{ code: string; name: string; departmentCode: string; description: string }> = [];

export async function ensureDepartmentSectionSeedData() {
  try {
    // 1. Auto-cleanup obsolete sections across any environment (production/staging)
    const obsoleteSecs = await db
      .select({ id: masterSections.id })
      .from(masterSections)
      .where(inArray(masterSections.code, OBSOLETE_SECTION_CODES));

    if (obsoleteSecs.length > 0) {
      const secIds = obsoleteSecs.map((s) => s.id);
      await db
        .update(employees)
        .set({ sectionId: null })
        .where(inArray(employees.sectionId, secIds));
      await db.delete(masterSections).where(inArray(masterSections.id, secIds));
    }

    // 2. Auto-cleanup obsolete departments across any environment (production/staging)
    const obsoleteDepts = await db
      .select({ id: masterDepartments.id })
      .from(masterDepartments)
      .where(inArray(masterDepartments.code, OBSOLETE_DEPARTMENT_CODES));

    if (obsoleteDepts.length > 0) {
      const deptIds = obsoleteDepts.map((d) => d.id);
      await db
        .update(employees)
        .set({ departmentId: null })
        .where(inArray(employees.departmentId, deptIds));
      await db.delete(masterDepartments).where(inArray(masterDepartments.id, deptIds));
    }
  } catch (cleanupError) {
    console.warn("[ensureDepartmentSectionSeedData] Auto-cleanup error:", cleanupError);
  }

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
