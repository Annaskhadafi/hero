import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  console.log("Updating menu section...");
  try {
    await db.execute(sql`
      UPDATE hero_navbar_menu_items 
      SET section = 'Recruitment Management' 
      WHERE resource = 'hc_recruitment'
    `);
    console.log("Menu section updated successfully!");
  } catch (error) {
    console.error("Failed to update:", error);
  }
  process.exit(0);
}

main();
