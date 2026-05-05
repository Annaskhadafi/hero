import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function bulkImport() {
  console.log("Bulk importing employees...");

  const existing = await db.select({ sn: centralServiceEmployees.employeeSn }).from(centralServiceEmployees);
  const existingSNs = new Set(existing.map((e) => e.sn));

  const toImport = await db.select().from(employees).where(eq(employees.isActive, true));
  const filtered = toImport.filter((emp) => !existingSNs.has(emp.employeeSn));

  console.log("Importing " + filtered.length + " employees...");

  const values = filtered.map((emp) => ({
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
  }));

  if (values.length > 0) {
    await db.insert(centralServiceEmployees).values(values);
    console.log("Done! Imported " + values.length + " employees");
  } else {
    console.log("No new employees to import");
  }
}

bulkImport().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
