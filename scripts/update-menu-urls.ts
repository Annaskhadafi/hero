import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function updateMenuUrls() {
  console.log("Updating menu URLs...");

  // Update Timesheet URL
  await db
    .update(navbarMenuItems)
    .set({ url: "/dashboard/timesheet" })
    .where(eq(navbarMenuItems.url, "/timesheet"));
  console.log("Updated Timesheet URL to /dashboard/timesheet");

  // Update Central Service URL
  await db
    .update(navbarMenuItems)
    .set({ url: "/dashboard/central-service" })
    .where(eq(navbarMenuItems.url, "/central-service"));
  console.log("Updated Central Service URL to /dashboard/central-service");

  // Update Cargo Manifest URL
  await db
    .update(navbarMenuItems)
    .set({ url: "/dashboard/cargo-manifest" })
    .where(eq(navbarMenuItems.url, "/cargo-manifest"));
  console.log("Updated Cargo Manifest URL to /dashboard/cargo-manifest");

  console.log("\nAll menu URLs updated!");
  
  const items = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  console.log("\nCentral Service menu items:");
  items.forEach((item) => {
    console.log("  - " + item.title + " -> " + item.url);
  });
}

updateMenuUrls().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
