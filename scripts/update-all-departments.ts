import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { eq } from "drizzle-orm";

async function updateDepartments() {
  console.log("Updating all employees to Central Service department...");

  const result = await db
    .update(centralServiceEmployees)
    .set({ department: "Central Service" });

  console.log("Updated all employees to Central Service department");
  
  // Verify
  const csEmployees = await db
    .select()
    .from(centralServiceEmployees)
    .where(eq(centralServiceEmployees.department, "Central Service"));
  
  console.log("\nTotal employees with Central Service department: " + csEmployees.length);
}

updateDepartments().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
