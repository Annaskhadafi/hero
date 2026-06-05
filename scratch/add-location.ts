import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  console.log("Adding location to recruitments...");
  try {
    await db.execute(sql`ALTER TABLE hero_hc_recruitments ADD COLUMN location TEXT NOT NULL DEFAULT '';`);
    console.log("Migration successful");
  } catch (error) {
    console.error("Failed to apply migration:", error);
  }
  process.exit(0);
}

main();
