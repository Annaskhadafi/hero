import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { like } from "drizzle-orm";

async function checkAllMenus() {
  console.log("Checking all menus with timesheet or cargo...\n");
  
  const items = await db.select().from(navbarMenuItems);
  
  const filtered = items.filter((item) => 
    item.url.includes("timesheet") || 
    item.url.includes("cargo") ||
    item.title.toLowerCase().includes("timesheet") ||
    item.title.toLowerCase().includes("cargo")
  );
  
  console.log("Found " + filtered.length + " related items:\n");
  filtered.forEach((item) => {
    console.log("ID: " + item.id + " | Title: " + item.title + " | URL: " + item.url + " | Section: " + item.section);
  });
}

checkAllMenus().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
