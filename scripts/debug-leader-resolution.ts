import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  const reviewerEmail = "mochamad.khadafi@chitraparatama.co.id";
  
  // 1. Get reviewer employee record
  const reviewer = await db.execute(sql`
    SELECT id, name, email, employee_sn, section, section_id, direct_manager_id, access_role
    FROM hero_employees
    WHERE lower(email) = lower(${reviewerEmail})
    LIMIT 1;
  `);
  console.log("=== Reviewer (Annas) ===");
  console.table(reviewer.rows);

  const annasRow = reviewer.rows[0] as any;
  const sectionId = annasRow?.section_id;
  const sectionName = annasRow?.section;

  // 2. Find matching section in masterSections by ID
  const sectionById = await db.execute(sql`
    SELECT ms.id, ms.name, ms.head_employee_id,
           e.id as head_emp_id, e.name as head_name, e.employee_sn as head_sn, e.email as head_email
    FROM hero_master_sections ms
    LEFT JOIN hero_employees e ON ms.head_employee_id = e.id
    WHERE ms.id = ${sectionId};
  `);
  console.log(`\n=== masterSections by section_id = ${sectionId} ===`);
  console.table(sectionById.rows);

  // 3. Find matching section in masterSections by name
  const sectionByName = await db.execute(sql`
    SELECT ms.id, ms.name, ms.head_employee_id,
           e.id as head_emp_id, e.name as head_name, e.employee_sn as head_sn, e.email as head_email
    FROM hero_master_sections ms
    LEFT JOIN hero_employees e ON ms.head_employee_id = e.id
    WHERE lower(ms.name) = lower(${sectionName});
  `);
  console.log(`\n=== masterSections by section name = '${sectionName}' ===`);
  console.table(sectionByName.rows);

  // 4. Get all active section heads (employees whose DB id appears as head_employee_id in masterSections)
  const allSectionHeads = await db.execute(sql`
    SELECT DISTINCT e.id, e.name, e.employee_sn, e.email, ms.name as section_name
    FROM hero_master_sections ms
    JOIN hero_employees e ON ms.head_employee_id = e.id
    WHERE e.is_active = true
    ORDER BY e.name;
  `);
  console.log("\n=== All Active Section Heads ===");
  console.table(allSectionHeads.rows);

  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
