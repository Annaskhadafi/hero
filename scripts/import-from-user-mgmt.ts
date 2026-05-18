import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function importFromUserManagement() {
  console.log("Importing employees from User Management...\n");

  const userMgmtEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.isActive, true));

  console.log("Found " + userMgmtEmployees.length + " active employees in User Management\n");

  let importedCount = 0;
  let skippedCount = 0;

  for (const emp of userMgmtEmployees) {
    try {
      // Check if already exists
      const [existing] = await db
        .select()
        .from(centralServiceEmployees)
        .where(eq(centralServiceEmployees.employeeSn, emp.employeeSn))
        .limit(1);

      if (existing) {
        skippedCount++;
        continue;
      }

      // Import
      await db.insert(centralServiceEmployees).values({
        employeeSn: emp.employeeSn,
        fullName: emp.name,
        email: emp.email,
        phoneNumber: emp.phoneNumber,
        siteId: emp.siteId,
        siteName: emp.workLocation,
        department: emp.department,
        section: emp.section,
        position: emp.jobTitle,
        employmentStatus: emp.employmentStatus,
        employmentType: "permanent",
        authUserId: emp.authUserId,
        isSyncedToUserManagement: true,
        syncedAt: new Date(),
      });

      importedCount++;
      console.log("Imported: " + emp.name + " (" + emp.employeeSn + ")");
    } catch (error) {
      console.error("Error importing " + emp.employeeSn + ":", error);
    }
  }

  console.log("\nImport complete!");
  console.log("  Imported: " + importedCount);
  console.log("  Skipped (already exists): " + skippedCount);
}

importFromUserManagement().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
