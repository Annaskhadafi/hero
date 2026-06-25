import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
  try {
    console.log("Adding attendees column to hero_inspections...");
    await db.execute(sql`ALTER TABLE "hero_inspections" ADD COLUMN IF NOT EXISTS "attendees" JSONB DEFAULT '[]'::jsonb;`);
    console.log("Successfully added attendees column!");
  } catch (error) {
    console.error("Failed to add column:", error);
  } finally {
    process.exit(0);
  }
}

main();
