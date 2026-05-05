import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function fixMenusPermanent() {
  console.log("Fixing menu sections permanently...\n");

  // Update Timesheet
  const [timesheet] = await db
    .update(navbarMenuItems)
    .set({ 
      section: "Central Service",
      sortOrder: 1
    })
    .where(eq(navbarMenuItems.id, 61))
    .returning();
  console.log("Updated Timesheet:");
  console.log("  Section: " + timesheet.section);
  console.log("  Sort Order: " + timesheet.sortOrder);

  // Update Cargo Manifest
  const [cargo] = await db
    .update(navbarMenuItems)
    .set({ 
      section: "Central Service",
      sortOrder: 2
    })
    .where(eq(navbarMenuItems.id, 62))
    .returning();
  console.log("\nUpdated Cargo Manifest:");
  console.log("  Section: " + cargo.section);
  console.log("  Sort Order: " + cargo.sortOrder);

  console.log("\n=== All Central Service Menus ===");
  const all = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  all.forEach((item) => {
    console.log(item.sortOrder + ". " + item.title + " -> " + item.url);
  });
}

fixMenusPermanent().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
