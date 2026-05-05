import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function fixMenuSections() {
  console.log("Fixing menu sections...\n");

  // Update Timesheet to Central Service
  await db
    .update(navbarMenuItems)
    .set({ 
      section: "Central Service",
      sortOrder: 1
    })
    .where(eq(navbarMenuItems.id, 61));
  console.log("Updated Timesheet to Central Service section");

  // Update Cargo Manifest to Central Service
  await db
    .update(navbarMenuItems)
    .set({ 
      section: "Central Service",
      sortOrder: 2
    })
    .where(eq(navbarMenuItems.id, 62));
  console.log("Updated Cargo Manifest to Central Service section");

  console.log("\nAll menus updated!\n");
  
  const items = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  console.log("Central Service menu items:");
  items.forEach((item) => {
    console.log("  " + item.sortOrder + ". " + item.title + " (" + item.url + ")");
  });
}

fixMenuSections().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
