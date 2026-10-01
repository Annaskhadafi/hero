import { db } from "@/db";
import { navbarMenuItems, securityRoles, roleMenuPermissions, employees } from "@/db/schema/hero";
import { getSidebarDataForUser } from "@/lib/hero-admin";
import { eq, sql } from "drizzle-orm";

async function main() {
  const users = await db.select().from(employees).where(sql`lower(email) like '%khadafi%' or lower(name) like '%khadafi%'`);
  console.log("Found employees:", users.map(u => ({ id: u.id, name: u.name, email: u.email, accessRole: u.accessRole })));

  const userEmail = users[0]?.email || "mochamad.khadafi@chitraparatama.co.id";
  const sidebarData = await getSidebarDataForUser(userEmail);

  console.log("\n--- SIDEBAR DATA FOR " + userEmail + " ---");
  console.log("navMain count:", sidebarData.navMain.length);
  console.log("navSecondary count:", sidebarData.navSecondary.length);
  console.log("documents count:", sidebarData.documents.length);

  const sections = new Set(sidebarData.navMain.map(i => i.section));
  console.log("\nSections in navMain:", Array.from(sections));

  console.log("\n--- NAV MAIN ITEMS ---");
  sidebarData.navMain.forEach(i => {
    console.log(`[${i.section}] ${i.title} -> ${i.url} (id: ${i.id}, parentId: ${i.parentId})`);
  });

  console.log("\n--- NAV SECONDARY ITEMS ---");
  sidebarData.navSecondary.forEach(i => {
    console.log(`[${i.section}] ${i.title} -> ${i.url} (id: ${i.id})`);
  });

  const allDbMenus = await db.select().from(navbarMenuItems);
  console.log("\nTotal all navbarMenuItems in DB:", allDbMenus.length);
  const hiddenOrInvisible = allDbMenus.filter(m => !m.isVisible);
  console.log("Invisible in DB:", hiddenOrInvisible.map(m => m.title));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
