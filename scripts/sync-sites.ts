import { db } from "../db/index.ts";
import { employees, sites } from "../db/schema/hero.ts";
import { eq } from "drizzle-orm";

async function run() {
  const allSites = await db.select().from(sites);
  const siteMap = new Map();
  for (const s of allSites) {
    siteMap.set(s.name.trim().toLowerCase(), s.id);
  }

  // Get ALL employees
  const allEmps = await db.select().from(employees);
  console.log(`Checking ${allEmps.length} employees...`);

  let updated = 0;
  for (const emp of allEmps) {
    if (emp.workLocation) {
      const locName = emp.workLocation.trim().toLowerCase();
      let foundSiteId = siteMap.get(locName);
      
      // Try partial match if not exact
      if (!foundSiteId) {
        for (const [sName, sId] of siteMap.entries()) {
          if (sName.includes(locName) || locName.includes(sName)) {
            foundSiteId = sId;
            break;
          }
        }
      }

      // If we found a site ID based on workLocation, and it's DIFFERENT from current siteId, update it.
      if (foundSiteId && foundSiteId !== emp.siteId) {
        await db.update(employees).set({ siteId: foundSiteId }).where(eq(employees.id, emp.id));
        updated++;
      }
    }
  }

  console.log(`Updated ${updated} employees' siteId based on workLocation.`);
  process.exit(0);
}

run().catch(console.error);
