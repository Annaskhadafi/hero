import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { sql } from "drizzle-orm";

async function removeSNPrefix() {
  console.log("Removing EMP- prefix from all SNs...\n");

  // Update all SNs to remove EMP- prefix
  await db.execute(sql`
    UPDATE hero_central_service_employees
    SET employee_sn = REPLACE(employee_sn, ${"EMP-"}, ${""})
    WHERE employee_sn LIKE ${"EMP-%"}
  `);

  console.log("Updated all SNs\n");

  // Verify
  const sample = await db.select().from(centralServiceEmployees).limit(10);
  console.log("Sample SNs after update:");
  sample.forEach((emp) => {
    console.log("  " + emp.employeeSn + " - " + emp.fullName);
  });
}

removeSNPrefix().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
