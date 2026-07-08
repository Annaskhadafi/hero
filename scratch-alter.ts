import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding exp_mine_permit column...");
  try {
    await db.execute(sql`ALTER TABLE hero_employees ADD COLUMN IF NOT EXISTS exp_mine_permit date;`);
    console.log("Column added successfully!");
  } catch (error) {
    console.error("Error adding column:", error);
  }
  process.exit(0);
}

main();
