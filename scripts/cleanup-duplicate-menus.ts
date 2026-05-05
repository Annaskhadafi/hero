import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq, and } from "drizzle-orm";

async function cleanupDuplicateMenus() {
  console.log("Cleaning up duplicate menu items...\n");

  // Remove old Cargo Manifest from Logistik section
  const deleted = await db
    .delete(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.url, "/dashboard/cargo-manifest"),
        eq(navbarMenuItems.section, "Logistik")
      )
    )
    .returning();

  if (deleted.length > 0) {
    console.log("Deleted old Cargo Manifest from Logistik section");
  }

  // Remove old Timesheet from Daily Activity section if exists
  const deletedTimesheet = await db
    .delete(navbarMenuItems)
    .where(
      and(
        eq(navbarMenuItems.url, "/dashboard/timesheet"),
        eq(navbarMenuItems.section, "Daily Activity")
      )
    )
    .returning();

  if (deletedTimesheet.length > 0) {
    console.log("Deleted old Timesheet from Daily Activity section");
  }

  console.log("\nCleanup complete!");
  
  // Show Central Service items
  const centralServiceItems = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  console.log("\nCentral Service menu items:");
  centralServiceItems.forEach((item) => {
    console.log("  - " + item.title + " (" + item.url + ")");
  });
}

cleanupDuplicateMenus().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
