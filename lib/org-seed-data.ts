import { db } from "@/db";
import { masterDepartments, masterSections } from "@/db/schema/hero";

const DEPARTMENT_SEEDS = [
  { code: "DEPT_BI_MARKETING", name: "BI & MARKETING", description: "Business Innovation & Marketing", isActive: true },
  { code: "DEPT_FINANCE", name: "FINANCE", description: "Finance Department", isActive: true },
  { code: "DEPT_OPERATION", name: "OPERATION", description: "Operation Department", isActive: true },
  { code: "DEPT_TECHNICAL", name: "TECHNICAL", description: "Technical Department", isActive: true },
  { code: "DEPT_QHSE", name: "QHSE", description: "Quality, Health, Safety, Environment", isActive: true },
];

const SECTION_SEEDS = [
  { code: "SEC_BI", name: "Business Innovation", departmentCode: "DEPT_BI_MARKETING", description: "Business Innovation Section" },
  { code: "SEC_MARKETING", name: "Marketing", departmentCode: "DEPT_BI_MARKETING", description: "Marketing Section" },
  { code: "SEC_DATABASE", name: "Database", departmentCode: "DEPT_BI_MARKETING", description: "Database Section" },
  { code: "SEC_IT", name: "Information Technology", departmentCode: "DEPT_BI_MARKETING", description: "IT Section" },
  { code: "SEC_FIN_BP", name: "Finance Business Partner", departmentCode: "DEPT_BI_MARKETING", description: "Finance BP Section" },
  { code: "SEC_FINANCE", name: "Finance", departmentCode: "DEPT_FINANCE", description: "Finance Section" },
  { code: "SEC_ACCOUNTING", name: "Accounting", departmentCode: "DEPT_FINANCE", description: "Accounting Section" },
  { code: "SEC_TAX", name: "Tax", departmentCode: "DEPT_FINANCE", description: "Tax Section" },
  { code: "SEC_PROCUREMENT", name: "Procurement", departmentCode: "DEPT_FINANCE", description: "Procurement Section" },
  { code: "SEC_OPERATION", name: "Operation", departmentCode: "DEPT_OPERATION", description: "Operation Section" },
  { code: "SEC_PM", name: "Project Management", departmentCode: "DEPT_OPERATION", description: "PM Section" },
  { code: "SEC_LOGISTIC", name: "Logistic", departmentCode: "DEPT_OPERATION", description: "Logistic Section" },
  { code: "SEC_ADMIN", name: "Administration", departmentCode: "DEPT_OPERATION", description: "Admin Section" },
  { code: "SEC_TECHNICAL", name: "Technical", departmentCode: "DEPT_TECHNICAL", description: "Technical Section" },
  { code: "SEC_ENGINEERING", name: "Engineering", departmentCode: "DEPT_TECHNICAL", description: "Engineering Section" },
  { code: "SEC_MAINTENANCE", name: "Maintenance", departmentCode: "DEPT_TECHNICAL", description: "Maintenance Section" },
  { code: "SEC_QUALITY", name: "Quality", departmentCode: "DEPT_QHSE", description: "Quality Section" },
  { code: "SEC_HSE", name: "HSE", departmentCode: "DEPT_QHSE", description: "HSE Section" },
];

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
