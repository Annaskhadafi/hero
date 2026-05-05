import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees } from "@/db/schema/hero";
import { eq, or } from "drizzle-orm";

async function reimportCorrectDepartment() {
  console.log("Clearing Central Service employees table...");
  await db.delete(centralServiceEmployees);
  console.log("Cleared\n");

  console.log("Importing only Central Services department employees...\n");

  // Get employees with Central Services department (with variations)
  const csEmployees = await db
    .select()
    .from(employees)
    .where(
      or(
        eq(employees.department, "Central Services"),
        eq(employees.department, "CENTRAL SERVICES"),
        eq(employees.department, "Central Service")
      )
    );

  console.log("Found " + csEmployees.length + " Central Services employees\n");

  const values = csEmployees.map((emp) => ({
    employeeSn: emp.employeeSn,
    fullName: emp.name,
    email: emp.email,
    phoneNumber: emp.phoneNumber,
    siteId: emp.siteId,
    siteName: emp.workLocation,
    department: emp.department,  // Keep original department
    position: emp.jobTitle,
    employmentStatus: emp.employmentStatus,
    employmentType: "permanent",
    authUserId: emp.authUserId,
    isSyncedToUserManagement: true,
    syncedAt: new Date(),
  }));

  if (values.length > 0) {
    await db.insert(centralServiceEmployees).values(values);
    console.log("Imported " + values.length + " employees");
  }

  console.log("\nDone!");
}

reimportCorrectDepartment().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
