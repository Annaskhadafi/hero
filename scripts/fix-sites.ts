import { db } from "@/db";
import { employees, sites } from "@/db/schema/hero";
import { eq, isNull, and, sql } from "drizzle-orm";

async function run() {
  const allSites = await db.select().from(sites);
  const siteMap = new Map();
  for (const s of allSites) {
    siteMap.set(s.name.trim().toLowerCase(), s.id);
  }

  // Get employees with missing siteId
  const missingSite = await db.select().from(employees).where(isNull(employees.siteId));
  console.log(`Found ${missingSite.length} employees with missing siteId`);

  let updated = 0;
  for (const emp of missingSite) {
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

      if (foundSiteId) {
        await db.update(employees).set({ siteId: foundSiteId }).where(eq(employees.id, emp.id));
        updated++;
      } else {
        // Default to a fallback site (e.g. Head Office) if there's any
        // For now let's use the first site ID just to not be null if required.
        const defaultSite = Array.from(siteMap.values())[0];
        if (defaultSite) {
            await db.update(employees).set({ siteId: defaultSite }).where(eq(employees.id, emp.id));
            updated++;
        }
      }
    } else {
        const defaultSite = Array.from(siteMap.values())[0];
        if (defaultSite) {
            await db.update(employees).set({ siteId: defaultSite }).where(eq(employees.id, emp.id));
            updated++;
        }
    }
  }

  console.log(`Updated ${updated} employees`);
  process.exit(0);
}

run().catch(console.error);
