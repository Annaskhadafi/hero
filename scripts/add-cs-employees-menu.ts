import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function addCentralServiceMenu() {
  console.log("Adding Central Service Employees menu...");

  const [existing] = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.url, "/central-service"))
    .limit(1);

  if (existing) {
    console.log("Menu already exists");
    return;
  }

  await db.insert(navbarMenuItems).values({
    menuArea: "main",
    section: "Central Service",
    title: "Employees",
    url: "/central-service",
    iconName: "Users",
    resource: "central-service-employees",
    sortOrder: 0,
    isVisible: true,
  });

  console.log("Created Central Service Employees menu");
  
  const allItems = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, "Central Service"));
  
  console.log("\nCentral Service menu items:");
  allItems.forEach((item) => {
    console.log("  " + item.sortOrder + ". " + item.title + " (" + item.url + ")");
  });
}

addCentralServiceMenu().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
