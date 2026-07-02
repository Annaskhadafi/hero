import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const res = await db.execute(sql`SELECT count(*) FROM "hero_central_service_assets"`);
    console.log("Table exists! Row count:", res.rows[0].count);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

main();
