/**
 * Seed Central Service menu items
 * Add Timesheet + Cargo Manifest under Central Service section
 */

import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq, and } from "drizzle-orm";

async function seedCentralServiceMenu() {
  console.log("Setting up Central Service menu items...\n");

  // Check if Timesheet menu exists
  const [existingTimesheet] = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.url, "/timesheet"))
    .limit(1);

  if (existingTimesheet) {
    console.log("Timesheet menu already exists");
  } else {
    // Create Timesheet menu item
    await db.insert(navbarMenuItems).values({
      menuArea: "main",
      section: "Central Service",
      title: "Timesheet",
      url: "/timesheet",
      iconName: "Clock",
      resource: "timesheet",
      sortOrder: 1,
      isVisible: true,
    });
    console.log("Created Timesheet menu item");
  }

  // Check if Cargo Manifest exists and update section
  const [existingCargo] = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.url, "/cargo-manifest"))
    .limit(1);

  if (existingCargo) {
    // Update section to Central Service
    await db
      .update(navbarMenuItems)
      .set({ section: "Central Service" })
      .where(eq(navbarMenuItems.id, existingCargo.id));
    console.log("Moved Cargo Manifest to Central Service section");
  } else {
    // Create Cargo Manifest menu item
    await db.insert(navbarMenuItems).values({
      menuArea: "main",
      section: "Central Service",
      title: "Cargo Manifest",
      url: "/cargo-manifest",
      iconName: "Package",
      resource: "cargo-manifest",
      sortOrder: 2,
      isVisible: true,
    });
    console.log("Created Cargo Manifest menu item");
  }

  console.log("\nCentral Service menu setup complete!");
  console.log("Menu items under Central Service section:");
  
  const centralServiceItems = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  centralServiceItems.forEach((item) => {
    console.log("  - " + item.title + " (" + item.url + ")");
  });
}

seedCentralServiceMenu()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
