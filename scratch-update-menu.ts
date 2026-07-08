import { db } from "./db";
import { navbarMenuItems } from "./db/schema/hero";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Moving Employee Data menu to Central Service...");
  
  const updated = await db.update(navbarMenuItems)
    .set({ section: "Central Service", groupLabel: "Management" })
    .where(eq(navbarMenuItems.url, "/dashboard/hc/employee"))
    .returning();
    
  console.log(`Updated ${updated.length} menu items.`);
}

main().catch(console.error);
