import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";

async function checkSiteNames() {
  const employees = await db.select().from(centralServiceEmployees).limit(30);
  
  console.log("Sample siteName values:");
  employees.forEach((emp) => {
    console.log("  " + emp.employeeSn + " | " + emp.fullName + " | siteName: " + emp.siteName);
  });
  
  // Unique site names
  const all = await db.select().from(centralServiceEmployees);
  const uniqueSites = [...new Set(all.map((e) => e.siteName))].filter(Boolean);
  console.log("\nUnique site names (" + uniqueSites.length + "):");
  uniqueSites.forEach((s) => console.log("  - " + s));
}

checkSiteNames().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
