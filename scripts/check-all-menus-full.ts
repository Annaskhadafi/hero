import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";

async function checkAllMenus() {
  const all = await db.select().from(navbarMenuItems);
  
  const timesheet = all.filter((m) => m.title.toLowerCase().includes("timesheet"));
  const cargo = all.filter((m) => m.title.toLowerCase().includes("cargo"));
  
  console.log("Timesheet menus found: " + timesheet.length);
  timesheet.forEach((m) => {
    console.log("  ID: " + m.id + " | Title: " + m.title + " | Section: " + m.section + " | URL: " + m.url);
  });
  
  console.log("\nCargo menus found: " + cargo.length);
  cargo.forEach((m) => {
    console.log("  ID: " + m.id + " | Title: " + m.title + " | Section: " + m.section + " | URL: " + m.url);
  });
}

checkAllMenus().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
