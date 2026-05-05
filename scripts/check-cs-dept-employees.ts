import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function checkCentralServiceEmployees() {
  console.log("Checking employees with Central Service department in User Management...\n");

  const csEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.department, "Central Service"));

  console.log("Found " + csEmployees.length + " employees with Central Service department\n");
  
  if (csEmployees.length > 0) {
    console.log("Sample employees:");
    csEmployees.slice(0, 5).forEach((emp) => {
      console.log("  - " + emp.name + " (" + emp.employeeSn + ") - " + emp.department);
    });
  }
}

checkCentralServiceEmployees().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
