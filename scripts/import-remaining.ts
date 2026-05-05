import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees } from "@/db/schema/hero";
import { eq, notInArray } from "drizzle-orm";

async function importRemaining() {
  console.log("Importing remaining employees...\n");

  // Get existing SNs in Central Service
  const existing = await db.select({ sn: centralServiceEmployees.employeeSn }).from(centralServiceEmployees);
  const existingSNs = existing.map((e) => e.sn);

  console.log("Already in Central Service: " + existingSNs.length);

  // Get employees not yet in Central Service
  const toImport = await db
    .select()
    .from(employees)
    .where(eq(employees.isActive, true));

  const filtered = toImport.filter((emp) => !existingSNs.includes(emp.employeeSn));

  console.log("To import: " + filtered.length + "\n");

  let imported = 0;
  for (const emp of filtered) {
    await db.insert(centralServiceEmployees).values({
      employeeSn: emp.employeeSn,
      fullName: emp.name,
      email: emp.email,
      phoneNumber: emp.phoneNumber,
      siteId: emp.siteId,
      siteName: emp.workLocation,
      department: emp.department,
      position: emp.jobTitle,
      employmentStatus: emp.employmentStatus,
      employmentType: "permanent",
      authUserId: emp.authUserId,
      isSyncedToUserManagement: true,
      syncedAt: new Date(),
    });
    imported++;
    if (imported % 50 === 0) {
      console.log("Imported " + imported + " / " + filtered.length);
    }
  }

  console.log("\nDone! Imported " + imported + " employees");
}

importRemaining().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
