import { db } from "./db";
import { employees, masterDepartments } from "./db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function main() {
  console.log("Updating gender for Central Services employees...");
  
  // Find the department ID for Central Services
  const depts = await db.select().from(masterDepartments).where(eq(masterDepartments.name, "Central Services"));
  
  if (depts.length === 0) {
    console.log("Department Central Services not found.");
    return;
  }
  
  const deptId = depts[0].id;
  console.log(`Found Central Services with ID: ${deptId}`);
  
  // Update employees
  const updated = await db.update(employees)
    .set({ gender: "L" })
    .where(eq(employees.departmentId, deptId))
    .returning();
    
  console.log(`Updated ${updated.length} employees to Laki-laki (L).`);
}

main().catch(console.error);
