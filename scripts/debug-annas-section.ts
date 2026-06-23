import { db } from "@/db";
import { sql } from "drizzle-orm";

async function run() {
  // 1. Get all employees matching "annas"
  const annasRows = await db.execute(sql`
    SELECT 
      e.id, e.name, e.email, e.employee_sn, e.section, e.section_id,
      e.direct_manager_id, e.department, e.work_location, e.access_role
    FROM hero_employees e
    WHERE lower(e.name) LIKE '%annas%'
    LIMIT 10;
  `);
  console.log("=== All Employees Named Like 'Annas' ===");
  console.table(annasRows.rows);

  // 2. Get master sections and their head
  const sections = await db.execute(sql`
    SELECT ms.id, ms.name, ms.head_employee_id,
           e.name as head_name, e.email as head_email, e.employee_sn as head_sn
    FROM hero_master_sections ms
    LEFT JOIN hero_employees e ON ms.head_employee_id = e.id
    ORDER BY ms.name;
  `);
  console.log("\n=== Master Sections with Head ===");
  console.table(sections.rows);
  
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
