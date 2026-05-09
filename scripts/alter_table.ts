import { db } from "../db";
import { sql } from "drizzle-orm";
process.env.DATABASE_SSL = "false";
async function main() {
  try {
    await db.execute(sql`ALTER TABLE hero_central_service_employees ADD COLUMN section text NOT NULL DEFAULT ''`);
    console.log("Column added");
  } catch (e: any) {
    console.error(e.message);
  }
  process.exit(0);
}
main();
