import { db } from "@/db";
import { sql } from "drizzle-orm";

async function addMenuHierarchyColumns() {
  console.log("Adding hierarchy columns to hero_navbar_menu_items...");

  await db.execute(sql`ALTER TABLE "hero_navbar_menu_items" ADD COLUMN IF NOT EXISTS "item_type" text NOT NULL DEFAULT 'menu'`);
  console.log("  + item_type column added");

  await db.execute(sql`ALTER TABLE "hero_navbar_menu_items" ADD COLUMN IF NOT EXISTS "parent_id" integer`);
  console.log("  + parent_id column added");

  await db.execute(sql`ALTER TABLE "hero_navbar_menu_items" ADD COLUMN IF NOT EXISTS "group_label" text`);
  console.log("  + group_label column added");

  console.log("Done!");
}

addMenuHierarchyColumns()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
