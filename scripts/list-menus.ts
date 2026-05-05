import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { like } from "drizzle-orm";

async function listAllMenus() {
  console.log("All menu items:\n");
  
  const allMenus = await db
    .select()
    .from(navbarMenuItems)
    .orderBy(navbarMenuItems.section, navbarMenuItems.sortOrder);
  
  let currentSection = "";
  
  allMenus.forEach((item) => {
    if (item.section !== currentSection) {
      console.log("\n[" + item.section + "]");
      currentSection = item.section;
    }
    console.log("  " + item.sortOrder + ". " + item.title + " -> " + item.url + " (" + item.iconName + ")");
  });
  
  console.log("\nTotal: " + allMenus.length + " menu items");
}

listAllMenus().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
