import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating job titles and level staff tables...");

  // Check if tables already exist
  const jobTitlesCheck = await db.execute(sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name = 'hero_master_job_titles'
  `);

  if (jobTitlesCheck.rows.length === 0) {
    await db.execute(sql`
      CREATE TABLE hero_master_job_titles (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Created hero_master_job_titles table");
  } else {
    console.log("hero_master_job_titles table already exists");
  }

  const levelStaffCheck = await db.execute(sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name = 'hero_master_level_staff'
  `);

  if (levelStaffCheck.rows.length === 0) {
    await db.execute(sql`
      CREATE TABLE hero_master_level_staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Created hero_master_level_staff table");
  } else {
    console.log("hero_master_level_staff table already exists");
  }

  // Seed data
  const existingJobTitles = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM hero_master_job_titles
  `);

  if (Number(existingJobTitles.rows[0]?.cnt ?? 0) === 0) {
    const jobTitles = [
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

    for (let i = 0; i < jobTitles.length; i++) {
      const name = jobTitles[i];
      const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const code = cleaned.slice(0, 5).padEnd(3, "0") + String(i + 1).padStart(2, "0");
      await db.execute(sql`
        INSERT INTO hero_master_job_titles (code, name, description, is_active, created_at, updated_at)
        VALUES (${code}, ${name}, '', true, NOW(), NOW())
      `);
    }
    console.log(`Inserted ${jobTitles.length} job titles`);
  } else {
    console.log("Job titles table already has data, skipping seed");
  }

  const existingLevelStaff = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM hero_master_level_staff
  `);

  if (Number(existingLevelStaff.rows[0]?.cnt ?? 0) === 0) {
    const levels = [
      { name: "BoD/Executive", sortOrder: 1 },
      { name: "Coordinator", sortOrder: 2 },
      { name: "Manager", sortOrder: 3 },
      { name: "Supervisor", sortOrder: 4 },
      { name: "Staff", sortOrder: 5 },
      { name: "Non Staff", sortOrder: 6 },
    ];

    for (const lvl of levels) {
      const code = lvl.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
      await db.execute(sql`
        INSERT INTO hero_master_level_staff (name, code, sort_order, is_active, created_at)
        VALUES (${lvl.name}, ${code}, ${lvl.sortOrder}, true, NOW())
      `);
    }
    console.log(`Inserted ${levels.length} level staff`);
  } else {
    console.log("Level staff table already has data, skipping seed");
  }

  console.log("Done!");
}

main().catch((error) => {
  console.error("Failed.", error);
  process.exit(1);
});
