import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { eq } from "drizzle-orm";

async function splitSectionAndSite() {
  console.log("Splitting siteName into Section and Site...\n");

  const all = await db.select().from(centralServiceEmployees);

  let updatedCount = 0;

  for (const emp of all) {
    const siteName = emp.siteName || "";
    const dashIndex = siteName.indexOf(" - ");

    if (dashIndex > 0) {
      const section = siteName.substring(0, dashIndex).trim();
      const site = siteName.substring(dashIndex + 3).trim();

      await db
        .update(centralServiceEmployees)
        .set({ 
          // @ts-ignore - section column has been removed
          section: section,
          siteName: site,
        })
        .where(eq(centralServiceEmployees.id, emp.id));

      updatedCount++;
      if (updatedCount % 50 === 0) {
        console.log("Updated " + updatedCount + " employees...");
      }
    }
  }

  console.log("\nDone! Updated " + updatedCount + " employees with dash\n");

  // Verify
  const sample = await db.select().from(centralServiceEmployees).limit(10);
  console.log("Sample after split:");
  sample.forEach((emp) => {
    console.log("  " + emp.employeeSn + " | " + emp.fullName);
    console.log("    Section: " + ((emp as any).section || "-") + " | Site: " + emp.siteName);
  });

  // Unique sections
  const sections: any = {};
  for (const emp of all) {
    const s = (emp as any).section || "-";
    sections[s] = (sections[s] || 0) + 1;
  }
  console.log("\nSection distribution:");
  Object.entries(sections).sort((a, b) => (b[1] as number) - (a[1] as number)).forEach(([s, c]) => {
    console.log("  " + c + " - " + s);
  });
}

splitSectionAndSite().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
