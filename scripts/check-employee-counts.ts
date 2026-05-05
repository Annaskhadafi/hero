import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { eq } from "drizzle-orm";

async function checkCounts() {
  const userMgmt = await db.select().from(employees).where(eq(employees.isActive, true));
  const centralService = await db.select().from(centralServiceEmployees);
  
  console.log("User Management: " + userMgmt.length + " active employees");
  console.log("Central Service: " + centralService.length + " employees");
}

checkCounts().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
