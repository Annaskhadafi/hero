import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  const r = await db.execute(sql`SELECT * FROM "user" WHERE email LIKE '%47006%'`);
  console.log(r.rows);
}

main().catch(console.error).finally(() => process.exit(0));
