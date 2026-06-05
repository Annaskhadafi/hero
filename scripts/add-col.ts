import { db } from "../db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding is_application_form column...");
  try {
    await db.execute(sql`ALTER TABLE hero_hc_online_tests ADD COLUMN is_application_form BOOLEAN NOT NULL DEFAULT FALSE;`);
    console.log("Success!");
  } catch (err: any) {
    if (err.message.includes("already exists")) {
      console.log("Column already exists.");
    } else {
      console.error(err);
    }
  }
}

run().catch(console.error);
