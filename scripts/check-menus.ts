import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function checkMenus() {
  console.log("Checking Central Service menus...\n");
  
  const items = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  console.log("Found " + items.length + " menu items:\n");
  items.forEach((item) => {
    console.log("ID: " + item.id);
    console.log("  Title: " + item.title);
    console.log("  URL: " + item.url);
    console.log("  Icon: " + item.iconName);
    console.log("  Sort Order: " + item.sortOrder);
    console.log("  Visible: " + item.isVisible);
    console.log("");
  });
}

checkMenus().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
