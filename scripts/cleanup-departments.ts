import { db } from "../db";
import { masterDepartments, masterSections } from "../db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function main() {
  // Delete sections first (FK constraint)
  const sectionCodes = [
    "SEC_BI", "SEC_MARKETING", "SEC_DATABASE", "SEC_IT", "SEC_FIN_BP",
    "SEC_FINANCE", "SEC_ACCOUNTING", "SEC_TAX", "SEC_PROCUREMENT",
    "SEC_OPERATION", "SEC_PM", "SEC_LOGISTIC", "SEC_ADMIN",
    "SEC_TECHNICAL", "SEC_ENGINEERING", "SEC_MAINTENANCE",
    "SEC_QUALITY", "SEC_HSE",
  ];
  
  const deletedSections = await db.delete(masterSections)
    .where(inArray(masterSections.code, sectionCodes))
    .returning({ code: masterSections.code });
  console.log(`🗑 Sections deleted: ${deletedSections.length}`);
  deletedSections.forEach(s => console.log(`   ${s.code}`));

  // Delete departments
  const deptCodes = ["DEPT_BI_MARKETING", "DEPT_FINANCE", "DEPT_OPERATION", "DEPT_TECHNICAL", "DEPT_QHSE"];
  const deletedDepts = await db.delete(masterDepartments)
    .where(inArray(masterDepartments.code, deptCodes))
    .returning({ code: masterDepartments.code, name: masterDepartments.name });
  console.log(`\n🗑 Departments deleted: ${deletedDepts.length}`);
  deletedDepts.forEach(d => console.log(`   ${d.code} — ${d.name}`));
  
  console.log("\n✅ Cleanup done.");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); }).finally(() => process.exit());
