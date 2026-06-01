import { db } from "../db";
import { navbarMenuItems, roleMenuPermissions, securityRoles } from "../db/schema/hero";
import { eq, inArray } from "drizzle-orm";

async function syncMenu() {
  console.log("Deleting old HC menus...");
  // Hapus menu HC lama agar diseed ulang
  await db.delete(navbarMenuItems).where(eq(navbarMenuItems.section, "HR"));
  
  console.log("Deleted. Now the app will re-seed them on the next load.");
  process.exit(0);
}

syncMenu().catch(console.error);
