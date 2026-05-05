import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function checkMenuDetails() {
  console.log("Checking Central Service menu details...\n");
  
  const items = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  console.log("Found " + items.length + " items:\n");
  items.forEach((item) => {
    console.log("Title: " + item.title);
    console.log("  Section: " + item.section);
    console.log("  Menu Area: " + item.menuArea);
    console.log("  Sort Order: " + item.sortOrder);
    console.log("  Visible: " + item.isVisible);
    console.log("  Resource: " + item.resource);
    console.log("");
  });
}

checkMenuDetails().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
