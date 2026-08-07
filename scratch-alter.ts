import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding parent_id to hero_activity_libraries...");
  try {
    const res = await db.execute(sql`
      ALTER TABLE hero_activity_libraries ADD COLUMN parent_id INT REFERENCES hero_activity_libraries(id) ON DELETE SET NULL;
    `);
    console.log("Result:", res);
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

main();
