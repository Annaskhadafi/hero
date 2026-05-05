import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { eq } from "drizzle-orm";

async function splitSectionAndSite() {
  console.log("Fetching employees...");

  const all = await db.select().from(centralServiceEmployees);
  const withDash = all.filter((emp) => (emp.siteName || "").includes(" - "));
  
  console.log("Employees with dash: " + withDash.length + " out of " + all.length);
  console.log("Processing...");

  let count = 0;
  for (const emp of withDash) {
    const siteName = emp.siteName || "";
    const dashIndex = siteName.indexOf(" - ");
    const section = siteName.substring(0, dashIndex).trim();
    const site = siteName.substring(dashIndex + 3).trim();

    await db
      .update(centralServiceEmployees)
      // @ts-ignore - section column has been removed
      .set({ section, siteName: site })
      .where(eq(centralServiceEmployees.id, emp.id));

    count++;
  }

  console.log("Done! Updated " + count + " employees");
}

splitSectionAndSite().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
