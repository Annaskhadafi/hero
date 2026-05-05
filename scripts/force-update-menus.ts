import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function forceUpdateMenus() {
  console.log("Force updating menus to Central Service section...\n");

  // Update Timesheet
  await db
    .update(navbarMenuItems)
    .set({ 
      section: "Central Service",
      sortOrder: 1
    })
    .where(eq(navbarMenuItems.id, 61));
  console.log("✓ Updated Timesheet (ID: 61)");

  // Update Cargo Manifest
  await db
    .update(navbarMenuItems)
    .set({ 
      section: "Central Service",
      sortOrder: 2
    })
    .where(eq(navbarMenuItems.id, 62));
  console.log("✓ Updated Cargo Manifest (ID: 62)");

  console.log("\n=== Verification ===");
  const csMenus = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  console.log("Total Central Service menus: " + csMenus.length + "\n");
  csMenus.forEach((m) => {
    console.log(m.sortOrder + ". " + m.title + " (" + m.url + ")");
  });
}

forceUpdateMenus().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
