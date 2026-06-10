import "dotenv/config";
import { db } from "@/db";
import { masterJobTitles, masterLevelStaff } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

const JOB_TITLES = [
  "Accounting & Asset SPV", "Accounting & Asset Staff", "Admin Service", "Admin Staff",
  "Billing", "Billing Coordinator", "Business Innovation & Marketing SPV", "Central Services Manager",
  "Continuous Process Improvement & IA Reps Manager", "Corporate Wellness Specialist Supervisor",
  "Database & Innovation Coordinator", "Database & Innovation SPV", "Database Engineer", "Director",
  "Executive Secretary", "Exim & Compliance Coordinator", "Export Import Compliance & Principal Relations Manager",
  "Facility & Maintenance Supervisor", "Finance Business Partner Manager", "Finance & Accounting Manager",
  "Finance Admin", "Finance Coordinator", "Finance Staff", "Finance Support & External Relation Manager",
  "General Admin", "General Manager", "HR Compensation & Benefit", "HR Operation & IR",
  "HR Recruitment & GA Staff", "HR-GA SPV", "HSE Admin", "HSE Coordinator", "HSE Officer",
  "Human Capital Manager", "Information Technology SPV", "Innovation Engineer", "IT Coordinator",
  "IT Support", "Leader Database & Innovation", "Leader HSE", "Leader Inventory",
  "Leader Repair / Retread Operation", "Leader Repair East Kutai Ws. Kabo", "Leader Technical Sumatera",
  "Leader Warehouse & Distribution", "Legal & ERM Manager", "Legal & ERM Staff",
  "Logistic Management SPV", "Maintenance & Electrical", "Maintenance Leader", "Major Account Coordinator",
  "Major Account Manager", "Major Account SPV", "Marketing & Corporate Comm. Coordinator",
  "National Sales Manager", "Office Strategic Management SPV", "PA Coordinator", "PA Staff", "PJO",
  "Planing & Data Analyst", "Procurement Coordinator", "Procurement Staff", "Quality Control",
  "Quality Final Inspection", "Quality Management Staff", "Repair / Retread Planner",
  "Repair / Retread Staff", "Repair Admin", "Repairman", "Reporting & Budget Staff", "Sales Admin",
  "Sales East Kal Leader", "Sales Engineer", "Sales Kalimantan SPV", "Sales Sumatera",
  "Service Operation MVC Admin", "Service Operation MVC SPV", "Service Operation Others Admin",
  "Service Operation Others Coord.", "Service Staff", "Serviceman", "Shift Leader Tyreman",
  "Supply Chain Management Manager", "Support Facilities Management Manager", "System & Digital Solution",
  "Technical Engineer", "Technical Leader", "Technician PA", "Trainer", "Training Center Coordinator",
  "Treasury Coordinator", "Treasury Staff", "Tyre Inspector", "Tyre Repair", "Tyreman", "VPS Agent",
  "Warehouse & Distribution", "Warehouse & Distribution Coord.", "Warehouse & Sales Admin Pekanbaru",
  "Warehouseman",
];

const LEVEL_STAFF = [
  { name: "BoD/Executive", sortOrder: 1 },
  { name: "Coordinator", sortOrder: 2 },
  { name: "Manager", sortOrder: 3 },
  { name: "Supervisor", sortOrder: 4 },
  { name: "Staff", sortOrder: 5 },
  { name: "Non Staff", sortOrder: 6 },
];

function makeCode(name: string, index: number): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 5).padEnd(3, "0") + String(index + 1).padStart(2, "0");
}

async function main() {
  console.log("Seeding job titles and level staff...");

  const existingJobTitles = await db.select({ id: masterJobTitles.id }).from(masterJobTitles);
  if (existingJobTitles.length === 0) {
    const jobTitleValues = JOB_TITLES.map((name, i) => ({
      code: makeCode(name, i),
      name,
      description: "",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.insert(masterJobTitles).values(jobTitleValues);
    console.log(`Inserted ${jobTitleValues.length} job titles`);
  } else {
    console.log(`Job titles table already has ${existingJobTitles.length} records, skipping`);
  }

  const existingLevelStaff = await db.select({ id: masterLevelStaff.id }).from(masterLevelStaff);
  if (existingLevelStaff.length === 0) {
    const levelValues = LEVEL_STAFF.map((ls) => ({
      code: ls.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10),
      name: ls.name,
      sortOrder: ls.sortOrder,
      isActive: true,
      createdAt: new Date(),
    }));
    await db.insert(masterLevelStaff).values(levelValues);
    console.log(`Inserted ${levelValues.length} level staff`);
  } else {
    console.log(`Level staff table already has ${existingLevelStaff.length} records, skipping`);
  }

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error("Seed failed.", error);
  process.exit(1);
});
