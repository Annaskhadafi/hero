import { db } from "../db";
import { masterDepartments, masterSections, masterPositions, employees } from "../db/schema/hero";
import { eq } from "drizzle-orm";
import * as fs from "fs";

const DEPT_CSV_TO_DB: Record<string, string> = {
  "BI & Marketing": "BIMA", "CI & Audit": "BPI", "Central Services": "CEN",
  "Finance & Accounting": "F-BIMA", "Human Capital": "HC", "Legal & ERM": "LEGAL",
  "Management": "MAN", "Sales Operation": "BC", "Supply Chain Dept": "SCM",
  "Support Facilities Management": "SFM",
};

const SECTION_CSV_TO_DB: Record<string, { code: string; deptCode: string }> = {
  "Accounting & Asset": { code: "SEC_CP_ACC_ASSET", deptCode: "F-BIMA" },
  "BI & Marketing": { code: "BIMA", deptCode: "BIMA" },
  "Billing": { code: "SEC_CP_BILLING", deptCode: "SCM" },
  "Business Innovation & Marketing": { code: "BIM", deptCode: "F-BIMA" },
  "Business Process Improvement & IA Reps.": { code: "BPI", deptCode: "MAN" },
  "CI & Audit": { code: "BPI", deptCode: "BPI" },
  "CSM": { code: "OFM", deptCode: "MAN" },
  "Central Services": { code: "CEN", deptCode: "CEN" },
  "Corcomm": { code: "SEC_CP_CORCOMM", deptCode: "HC" },
  "Corporate Wellness Specialist": { code: "WEL", deptCode: "HC" },
  "Database Management": { code: "DBI", deptCode: "F-BIMA" },
  "EXIM Compliance & Procurement": { code: "SEC_supply_chain_dept_export_import_compliance___principal_relation", deptCode: "SCM" },
  "Exim & Compliance": { code: "SEC_supply_chain_dept_export_import_compliance___principal_relation", deptCode: "SCM" },
  "Facility & Maintenance": { code: "SEC_support_facilities_management_support_facility_management", deptCode: "SFM" },
  "Finance": { code: "SEC_CP_FIN_OPS", deptCode: "F-BIMA" },
  "Finance & Accounting": { code: "FIN", deptCode: "F-BIMA" },
  "Finance Business Partner": { code: "FBC", deptCode: "F-BIMA" },
  "Finance Support & External Relation": { code: "FER", deptCode: "F-BIMA" },
  "HRGA": { code: "HR", deptCode: "HC" },
  "HSE": { code: "HSE", deptCode: "HC" },
  "Human Capital": { code: "HC", deptCode: "HC" },
  "IT": { code: "IT", deptCode: "F-BIMA" },
  "Information Technology": { code: "IT", deptCode: "F-BIMA" },
  "Inventory & Warehouse Management": { code: "SEC_supply_chain_dept_warehouse___distribution", deptCode: "SCM" },
  "Inventory": { code: "SEC_supply_chain_dept_inventory", deptCode: "SCM" },
  "Legal & ERM": { code: "SEC_legal___erm_legal___erm__insurance", deptCode: "LEGAL" },
  "Legal & ERM (Insurance)": { code: "SEC_legal___erm_legal___erm__insurance", deptCode: "LEGAL" },
  "Logistic Management": { code: "SEC_supply_chain_dept_logistic_management", deptCode: "SCM" },
  "Major Account": { code: "SEC_sales_operation_major_account", deptCode: "BC" },
  "Management": { code: "MAN", deptCode: "MAN" },
  "Mark., Research & Innovation": { code: "SEC_CP_MRI", deptCode: "BIMA" },
  "Markcomm": { code: "MAR", deptCode: "BIMA" },
  "Marketing & Corporate Comm": { code: "MAR", deptCode: "BIMA" },
  "National Sales": { code: "SEC_sales_operation_national_sales", deptCode: "BC" },
  "Office Strategic Management": { code: "OFM", deptCode: "MAN" },
  "Procurement": { code: "SEC_supply_chain_dept_procurement", deptCode: "SCM" },
  "Product Accessories": { code: "PA", deptCode: "CEN" },
  "Quality Management": { code: "CI", deptCode: "BPI" },
  "Repair & Retread": { code: "RPR", deptCode: "CEN" },
  "Repair / Retread Operation": { code: "RPR", deptCode: "CEN" },
  "Sales East Indonesia": { code: "SEC_sales_operation_sales_east_indonesia", deptCode: "BC" },
  "Sales Java": { code: "SEC_CP_SALES_JAVA", deptCode: "BC" },
  "Sales Java Sumatra": { code: "SEC_CP_SALES_JAVA_SUMATRA", deptCode: "BC" },
  "Sales Kalimantan": { code: "SEC_sales_operation_sales_kalimantan", deptCode: "BC" },
  "Sales Operation": { code: "SEC_sales_operation_national_sales", deptCode: "BC" },
  "Sales Palembang": { code: "SEC_CP_SALES_PALEMBANG", deptCode: "BC" },
  "Sales Pekanbaru": { code: "SEC_CP_SALES_PEKANBARU", deptCode: "BC" },
  "Service Operation": { code: "SVO", deptCode: "CEN" },
  "Service Operation MVC": { code: "SVC", deptCode: "CEN" },
  "Service Operation Others": { code: "SVO", deptCode: "CEN" },
  "Supply Chain": { code: "SEC_CP_SCM", deptCode: "SCM" },
  "Supply Chain Dept": { code: "SEC_CP_SCM", deptCode: "SCM" },
  "Supply Chain Management": { code: "SCM", deptCode: "SCM" },
  "Support Facilities Management": { code: "SEC_support_facilities_management_support_facility_management", deptCode: "SFM" },
  "Support Facility Management": { code: "SEC_support_facilities_management_support_facility_management", deptCode: "SFM" },
  "Technical": { code: "TE", deptCode: "CEN" },
  "Technical Operation": { code: "TE", deptCode: "CEN" },
  "Training Center": { code: "SEC_human_capital_training_center", deptCode: "HC" },
  "Warehouse & Distribution": { code: "SEC_supply_chain_dept_warehouse___distribution", deptCode: "SCM" },
};

function mapPositionCode(level: string): string {
  const lvl = (level || "").trim().toLowerCase();
  if (lvl.includes("manager")) return "POS_MGR";
  if (lvl.includes("supervisor")) return "POS_SPV";
  if (lvl.includes("coordinator")) return "POS_COORD";
  if (lvl.includes("leader")) return "POS_LEADER";
  if (lvl.includes("staff")) return "POS_STAFF";
  if (lvl.includes("technician")) return "POS_TECHNICIAN";
  if (lvl.includes("engineer")) return "POS_ENGINEER";
  return "POS_STAFF";
}

function mapSiteId(location: string, workLocation: string): number {
  const loc = ((location || workLocation) || "").toLowerCase();
  if (loc.includes("jakarta") || loc.includes("head office")) return 3;
  if (loc.includes("balikpapan")) return 4;
  return 5;
}

async function main() {
  console.log("Loading DB maps...");
  const deptByCode = new Map<string, number>();
  const deptByName = new Map<string, number>();
  (await db.select().from(masterDepartments)).forEach((d: any) => {
    if (d?.code) deptByCode.set(d.code, d.id);
    if (d?.name) deptByName.set(d.name.toLowerCase(), d.id);
  });

  const sectionByCode = new Map<string, number>();
  const sectionByName = new Map<string, number>();
  (await db.select().from(masterSections)).forEach((s: any) => {
    if (s?.code) sectionByCode.set(s.code, s.id);
    if (s?.name) sectionByName.set(s.name.toLowerCase(), s.id);
  });

  const positionByCode = new Map<string, number>();
  (await db.select().from(masterPositions)).forEach((p: any) => {
    if (p?.code) positionByCode.set(p.code, p.id);
  });

  // Create missing sections
  console.log("Creating missing sections...");
  let sectionsCreated = 0;
  for (const [csvName, meta] of Object.entries(SECTION_CSV_TO_DB)) {
    if (!sectionByCode.has(meta.code)) {
      const deptId = deptByCode.get(meta.deptCode) ?? null;
      try {
        await db.insert(masterSections).values({ code: meta.code, name: csvName, departmentId: deptId, isActive: true });
        sectionsCreated++;
      } catch (e: any) {
        if (!e.message?.includes("duplicate key")) throw e;
      }
    }
  }
  // Refresh
  (await db.select().from(masterSections)).forEach((s: any) => {
    if (s?.code) sectionByCode.set(s.code, s.id);
    if (s?.name) sectionByName.set(s.name.toLowerCase(), s.id);
  });
  console.log(`  ${sectionsCreated} new sections created`);

  // Parse CSV
  console.log("Parsing CSV...");
  let raw = fs.readFileSync("D:\\[01] PROJECT\\HERO\\datahero.csv", { encoding: "utf8" });
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const rows = raw.split(/\r?\n/).filter(r => r.trim());
  if (rows.length < 2) { console.log("No data"); return; }
  const dataRows = rows.slice(1);

  let inserted = 0, updated = 0, skipped = 0;
  const seen = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i].split(";");
    if (cols.length < 17) { skipped++; continue; }

    const name = (cols[1] || "").trim();
    const email = (cols[2] || "").trim().toLowerCase();
    if (!name || !email) { skipped++; continue; }
    if (seen.has(email)) { skipped++; continue; }
    seen.add(email);

    const csvDept = (cols[12] || "").trim();
    const csvSection = (cols[13] || "").trim() || (cols[4] || "").trim();
    const level = (cols[6] || "").trim();
    const jobLevel = (cols[16] || "").trim();
    const joinDate = (cols[8] || "").trim();
    const birthDate = (cols[9] || "").trim();
    const location = (cols[11] || "").trim();
    const workLocation = (cols[14] || "").trim();
    const status = (cols[5] || "Permanent").trim();
    const demoStatus = (cols[26] || "").trim();

    const deptCode = DEPT_CSV_TO_DB[csvDept] ?? "";
    const deptId = deptByCode.get(deptCode) ?? deptByName.get(csvDept.toLowerCase()) ?? null;

    const secMeta = SECTION_CSV_TO_DB[csvSection];
    const secCode = secMeta?.code ?? "";
    const secId = sectionByCode.get(secCode) ?? sectionByName.get(csvSection.toLowerCase()) ?? null;

    const posId = positionByCode.get(mapPositionCode(level)) ?? null;
    const siteId = mapSiteId(location, workLocation);
    const joinYear = joinDate ? new Date(joinDate).getFullYear() : new Date().getFullYear();

    const existing = await db.select({ id: employees.id }).from(employees).where(eq(employees.email, email));

    if (existing.length > 0) {
      await db.update(employees).set({
        departmentId: deptId, sectionId: secId, positionId: posId, siteId,
        department: csvDept, section: csvSection,
        jobTitle: jobLevel || level, role: level || "Staff",
        workLocation: workLocation || location,
        employmentStatus: status, employeeStatusType: demoStatus,
        birthPlaceDate: birthDate, joinYear,
      }).where(eq(employees.id, existing[0].id));
      updated++;
    } else {
      await db.insert(employees).values({
        siteId, name, email,
        employeeSn: cols[0]?.trim() ? `EMP-${cols[0].trim()}` : "",
        role: level || "Staff", department: csvDept, section: csvSection,
        jobTitle: jobLevel || level,
        departmentId: deptId, sectionId: secId, positionId: posId,
        accessRole: "User", joinYear,
        workLocation: workLocation || location,
        birthPlaceDate: birthDate,
        employmentStatus: status, employeeStatusType: demoStatus,
        isActive: true,
      });
      inserted++;
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${dataRows.length}`);
  }
  console.log(`\nDone! Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
}
main().catch(e => { console.error("Error:", e); process.exit(1); }).finally(() => process.exit(0));
