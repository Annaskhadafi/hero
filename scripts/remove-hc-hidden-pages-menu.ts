import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { inArray } from "drizzle-orm";

const removedUrls = [
  "/dashboard/hc/leave",
  "/dashboard/hc/onboarding",
  "/dashboard/hc/offboarding",
];

async function removeHcHiddenPagesMenu() {
  const deletedMenuItems = await db
    .delete(navbarMenuItems)
    .where(inArray(navbarMenuItems.url, removedUrls))
    .returning({ id: navbarMenuItems.id, title: navbarMenuItems.title, url: navbarMenuItems.url });

  if (deletedMenuItems.length === 0) {
    console.log("No HC leave/onboarding/offboarding menu rows found.");
    return;
  }

  console.log("Deleted HC menu rows:");
  for (const item of deletedMenuItems) {
    console.log(`- ${item.id}: ${item.title} (${item.url})`);
  }
}

removeHcHiddenPagesMenu()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });