import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";

async function checkSNFormat() {
  console.log("Checking SN format...\n");

  const employees = await db.select().from(centralServiceEmployees).limit(10);

  console.log("Sample SNs:");
  employees.forEach((emp) => {
    console.log("  " + emp.employeeSn + " - " + emp.fullName);
  });
}

checkSNFormat().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
